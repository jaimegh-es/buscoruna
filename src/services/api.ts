import { Capacitor } from '@capacitor/core';

export const PROD_API_HOST = 'https://coruñabus.inled.es';
export const BASE_URL = Capacitor.isNativePlatform() ? `${PROD_API_HOST}/api/proxy` : '/api/proxy';

// Concurrency limit: max simultaneous requests to the upstream API.
// Additional requests are queued and released as soon as a slot frees up.
const CONCURRENCY_LIMIT = 3;

// Retry policy for transient errors (network failures / 5xx).
const MAX_RETRIES = 2;
const RETRY_BASE_DELAY = 1500;

// Client-side fetch timeout: a request to the proxy must never hang forever.
// The proxy aborts itself at ~10s, so anything still open past this is a
// stalled connection. Aborts fail fast (no retry, no circuit-breaker), and the
// next scheduled refresh simply tries again.
const REQUEST_TIMEOUT_MS = 15000;

// Global API circuit breaker: after a server failure (5xx / 429 / network error)
// all API calls are blocked to avoid saturating the server. The upstream
// rate-limits hard (1 req/s, 4/min, it answers 429 with an HTML body), so 429s
// get a longer pause than generic failures. Persisted in sessionStorage so it
// survives a page reload.
const COOLDOWN_MS = 30000;
const RATE_LIMIT_COOLDOWN_MS = 60000;
const COOLDOWN_KEY = 'buscoruna_api_cooldown_until';
let cooldownUntil = parseInt(sessionStorage.getItem(COOLDOWN_KEY) || '0', 10) || 0;
let cooldownEndTimer: any = null;

// Proactive rate limiting: a token bucket that keeps us under the upstream
// budgets (1 req/s, 4/min, 199/h) so we never trip the rate limiter in the
// first place. Requests that arrive with an empty bucket wait in the queue
// until a token refills (max ~3/min sustained) instead of firing extra calls.
const RATE_BUCKET_CAPACITY = 4;
const RATE_REFILL_INTERVAL_MS = 20000;
const RATE_MIN_SPACING_MS = 1000;
const RATE_BUCKET_KEY = 'buscoruna_api_rate_bucket';
let rateTokens = RATE_BUCKET_CAPACITY;
let lastRateRefill = Date.now();
let lastRequestAt = 0;
try {
  const saved = JSON.parse(sessionStorage.getItem(RATE_BUCKET_KEY) || 'null');
  if (saved && typeof saved.tokens === 'number' && typeof saved.at === 'number') {
    rateTokens = Math.min(RATE_BUCKET_CAPACITY, Math.max(0, saved.tokens));
    // A stored refill timestamp in the future (device clock moved backwards,
    // NTP sync, manual clock change...) would starve the bucket forever: the
    // tokens would never refill and every request would hang. Clamp it so the
    // limiter always stays live.
    lastRateRefill = Math.min(saved.at, Date.now());
  }
} catch {
  // ignore corrupted bucket state, start fresh
}

function persistRateBucket() {
  try {
    sessionStorage.setItem(RATE_BUCKET_KEY, JSON.stringify({ tokens: rateTokens, at: lastRateRefill }));
  } catch {
    // storage unavailable - keep going in memory only
  }
}

function refillRateTokens() {
  const now = Date.now();
  if (now < lastRateRefill) {
    // Clock moved backwards: correct the refill anchor so the bucket never
    // waits on a future timestamp (that state makes tokens 0 forever).
    lastRateRefill = now;
    persistRateBucket();
    return;
  }
  const gained = Math.floor((now - lastRateRefill) / RATE_REFILL_INTERVAL_MS);
  if (gained > 0) {
    rateTokens = Math.min(RATE_BUCKET_CAPACITY, rateTokens + gained);
    lastRateRefill += gained * RATE_REFILL_INTERVAL_MS;
    persistRateBucket();
  }
}

// Absolute cap for waiting on a rate token. Even in pathological bucket states
// a caller must never be blocked forever: the upstream throttle tolerates an
// occasional extra request far better than a frozen UI.
const PACE_MAX_WAIT_MS = 120000;

// Wait until a request token is available and the minimum 1s spacing since the
// last upstream call is satisfied. Consumes exactly one token.
async function paceRequest() {
  const deadline = Date.now() + PACE_MAX_WAIT_MS;
  while (true) {
    refillRateTokens();
    if (rateTokens >= 1) {
      rateTokens -= 1;
      persistRateBucket();
      const wait = RATE_MIN_SPACING_MS - (Date.now() - lastRequestAt);
      if (wait > 0) await sleep(wait);
      lastRequestAt = Date.now();
      return;
    }
    if (Date.now() >= deadline) {
      // Safety valve: borrow a token instead of hanging the caller indefinitely.
      rateTokens = 0;
      lastRequestAt = Date.now();
      persistRateBucket();
      return;
    }
    await sleep(500);
  }
}

export function isApiCooldownActive() {
  return Date.now() < cooldownUntil;
}

export function getApiCooldownRemaining() {
  return Math.max(0, cooldownUntil - Date.now());
}

function startApiCooldown(ms: number = COOLDOWN_MS) {
  if (isApiCooldownActive()) return;
  cooldownUntil = Date.now() + ms;
  sessionStorage.setItem(COOLDOWN_KEY, cooldownUntil.toString());
  window.dispatchEvent(new CustomEvent('api-cooldown-start', { detail: { remaining: ms } }));
  if (cooldownEndTimer) clearTimeout(cooldownEndTimer);
  cooldownEndTimer = setTimeout(() => {
    cooldownUntil = 0;
    sessionStorage.removeItem(COOLDOWN_KEY);
    window.dispatchEvent(new CustomEvent('api-cooldown-end'));
  }, ms);
}

let totalPending = 0;   // in-flight + queued requests (drives the loading state)
let activeRequests = 0; // in-flight requests only (drives the concurrency limit)
const waiters: Array<() => void> = [];

export function isApiLoading() {
  return totalPending > 0;
}

function updateLoadingState(delta: number) {
  totalPending += delta;
  if (totalPending === 1 && delta === 1) {
    window.dispatchEvent(new CustomEvent('api-loading-start'));
  } else if (totalPending === 0) {
    window.dispatchEvent(new CustomEvent('api-loading-end'));
  }
}

async function acquire() {
  if (activeRequests < CONCURRENCY_LIMIT) {
    activeRequests++;
    return;
  }
  await new Promise<void>((resolve) => {
    waiters.push(resolve);
  });
  activeRequests++;
}

function release() {
  activeRequests--;
  if (waiters.length > 0) {
    const next = waiters.shift()!;
    activeRequests++;
    next();
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  return fetch(url, { signal: controller.signal }).finally(() => clearTimeout(timer));
}

async function fetchWithRetry(url: string): Promise<any> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      // Every physical request to the upstream consumes a rate token (retries
      // included) - this is what keeps us under the 4/min budget proactively.
      await paceRequest();
      const response = await fetchWithTimeout(url);

      if (response.status === 429) {
        // The upstream rate-limits (1 req/s, 4/min) and retrying only makes it
        // worse: open a long cooldown immediately and fail fast in all loops.
        const retryAfter = parseInt(response.headers.get('retry-after') || '', 10);
        const delay = (retryAfter && !isNaN(retryAfter))
          ? Math.max(RATE_LIMIT_COOLDOWN_MS, retryAfter * 1000)
          : RATE_LIMIT_COOLDOWN_MS;
        startApiCooldown(delay);
        throw Object.assign(new Error('API rate limited (429)'), { rateLimited: true });
      }

      const retryable = response.status >= 500;

      if (!response.ok && !retryable) {
        throw Object.assign(new Error(`API error: ${response.status} ${response.statusText}`), { clientError: true });
      }

      if (retryable && attempt < MAX_RETRIES) {
        await sleep(RETRY_BASE_DELAY * Math.pow(2, attempt));
        continue;
      }

      if (!response.ok) {
        // Server failures (5xx/429) exhausted retries - report as such.
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error: any) {
      // Aborts, client errors (400/403/404) and rate limits are not retryable.
      if (error?.name === 'AbortError' || error?.clientError || error?.rateLimited) throw error;
      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_BASE_DELAY * Math.pow(2, attempt));
        continue;
      }
      // Last retry failed: the upstream server is having troubles, open the breaker.
      startApiCooldown();
      throw error;
    }
  }
  // Retryable status (429/5xx) exhausted: open the breaker too.
  startApiCooldown();
  throw new Error('Unexpected retry exhaustion');
}

export async function getQuery(func: number, dato: string) {
  // While the circuit breaker is open, reject instantly without touching the
  // network or the queue. Auto-refresh loops will fail fast and stop hammering.
  if (isApiCooldownActive()) {
    throw new Error('API cooldown active');
  }

  const url = `${BASE_URL}?func=${func}&dato=${dato}`;

  updateLoadingState(1);

  try {
    await acquire();
    try {
      return await fetchWithRetry(url);
    } finally {
      release();
    }
  } finally {
    updateLoadingState(-1);
  }
}

// --- Stop arrivals cache -----------------------------------------------------
// The stop page and the live tracking bar ask for the same arrival data, so a
// short-lived cache lets the tracking ETA appear instantly after a stop page
// fetch (or a recent refresh) without spending an extra upstream request.
// In-flight requests are also deduplicated: concurrent callers for the same
// stop share a single upstream call.
const ARRIVALS_CACHE_TTL_MS = 20000;
const arrivalsCache = new Map<string, { at: number; data: any }>();
const arrivalsInflight = new Map<string, Promise<any>>();

function getStopArrivalsCached(stopId: number, force: boolean = false): Promise<any> {
  const key = stopId.toString();

  if (!force) {
    const cached = arrivalsCache.get(key);
    if (cached && Date.now() - cached.at < ARRIVALS_CACHE_TTL_MS) {
      return Promise.resolve(cached.data);
    }
  }

  const flightKey = `${key}:${force ? 'f' : 'c'}`;
  const existing = arrivalsInflight.get(flightKey);
  if (existing) return existing;

  const p = getQuery(0, key)
    .then((data) => {
      if (data && data.resultado) {
        arrivalsCache.set(key, { at: Date.now(), data });
      }
      return data;
    })
    .finally(() => {
      arrivalsInflight.delete(flightKey);
    });

  arrivalsInflight.set(flightKey, p);
  return p;
}

export const API = {
  // Real-time arrivals for a stop (cached ~20s; pass `true` to force a refresh)
  getStopArrivals: (stopId: number, force: boolean = false) =>
    getStopArrivalsCached(stopId, force),

  // List of lines (basic info)
  getLines: () => getQuery(1, '1'),

  // Detailed info for a line (stops, current buses)
  getLineInfo: (lineId: number) => getQuery(2, lineId.toString()),

  // Find nearby stops
  getNearbyStops: (lat: number, lng: number, radius: number = 5000, max: number = 5) =>
    getQuery(3, `${lat}_${lng}_${radius}_${max}`),

  // Full catalog
  getCatalog: (date = '20160101T000000', lang = 'es') =>
    getQuery(7, `${date}_${lang}_0_20160101T000000`),

  // Schedules for a line
  getSchedules: (lineId: number, date: string) =>
    getQuery(8, `${lineId}&fecha=${date}`),

  // Map data
  getMapData: (lineId: number, show: 'B' | 'PRB') =>
    getQuery(99, `${lineId}&mostrar=${show}`),
};