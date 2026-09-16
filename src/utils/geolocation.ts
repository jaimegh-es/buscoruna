import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';

export interface GeolocationResult {
  lat: number;
  lon: number;
}

const PERMISSION_DENIED = 1;

export const isNativePlatform = (): boolean => {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
};

function requestWebPosition(options: PositionOptions): Promise<GeolocationResult> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('Geolocation API unavailable'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      (err) => reject(err),
      options
    );
  });
}

async function getNativePosition(): Promise<GeolocationResult | null> {
  // In the native Android/iOS app the WebView's geolocation usually cannot
  // access the device sensors, so we use the Capacitor Geolocation plugin to
  // read the real device GPS position.
  try {
    const status = await Geolocation.checkPermissions();
    if (status.location && status.location !== 'granted') {
      const granted = await Geolocation.requestPermissions();
      if (granted.location !== 'granted') return null;
    }

    // Fast, cached/network fix first: the fused provider can return a recent
    // position almost instantly even indoors, where a full GPS lock times out.
    const low = await nativeGetOnce({ enableHighAccuracy: false, timeout: 3000, maximumAge: 600000 });
    if (low) return low;

    const high = await nativeGetOnce({ enableHighAccuracy: true, timeout: 8000, maximumAge: 0 });
    if (high) return high;

    // Last resort: some devices only deliver fixes while "watching". Start a
    // short watch session and resolve on the first available fix.
    return await nativeWatchOnce(8000);
  } catch {
    return null;
  }
}

function toResult(pos: { coords?: { latitude?: number; longitude?: number } } | null): GeolocationResult | null {
  if (pos?.coords && typeof pos.coords.latitude === 'number' && typeof pos.coords.longitude === 'number') {
    return { lat: pos.coords.latitude, lon: pos.coords.longitude };
  }
  return null;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);
    promise.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); }
    );
  });
}

async function nativeGetOnce(options: { enableHighAccuracy: boolean; timeout: number; maximumAge: number }): Promise<GeolocationResult | null> {
  try {
    const pos = await withTimeout(Geolocation.getCurrentPosition(options), options.timeout + 2000);
    return toResult(pos as never);
  } catch {
    return null;
  }
}

function nativeWatchOnce(durationMs: number): Promise<GeolocationResult | null> {
  return new Promise((resolve) => {
    let watchId: string | undefined;
    let done = false;
    const finish = (value: GeolocationResult | null) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      if (watchId) Geolocation.clearWatch({ id: watchId }).catch(() => {});
      resolve(value);
    };
    const timer = setTimeout(() => finish(null), durationMs);
    Geolocation.watchPosition({ enableHighAccuracy: false }, (pos) => {
      const result = toResult(pos as never);
      if (result) finish(result);
    }).then((id) => {
      watchId = id;
    }).catch(() => finish(null));
  });
}

/**
 * Obtains the user's position as reliably as possible.
 *
 * Native app: reads the device GPS through the Capacitor Geolocation plugin.
 * Web/PWA: fast, low-accuracy fix first (network / cached fix, up to 60s old)
 * and, on failure (except a denied permission prompt), one retry with high
 * accuracy.
 *
 * Returns `null` when the position cannot be obtained.
 */
export async function getPosition(): Promise<GeolocationResult | null> {
  if (Capacitor.isNativePlatform()) {
    return await getNativePosition();
  }

  if (typeof navigator === 'undefined' || !navigator.geolocation) return null;

  try {
    return await requestWebPosition({ enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 });
  } catch (err) {
    const code = (err as GeolocationPositionError | undefined)?.code;
    if (code === PERMISSION_DENIED) return null;
  }

  try {
    return await requestWebPosition({ enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
  } catch {
    return null;
  }
}