// Background bus-arrival alerts using Capacitor Local Notifications.
// A native Android AlarmManager-based schedule checks the bus ETA in the
// background and fires a notification when the bus is within the user's
// chosen lead time (minutes before arrival).
//
// Avisos de llegada en segundo plano usando Local Notifications de Capacitor.
// Una alarma nativa de Android comprueba el tiempo del bus en segundo plano y
// dispara una notificación cuando queda el tiempo de antelación elegido.

import { Capacitor, registerPlugin } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Preferences } from '@capacitor/preferences';
import { tracking, getWalkHeadStart, type TrackingInfo } from './tracking';

export interface BackgroundTrackerPlugin {
    startTracking(options: {
        busId: string;
        lineId: string | number;
        originStopId: number;
        originStopName?: string;
        destinationStopId: number;
        destinationStopName?: string;
        destLat?: number;
        destLon?: number;
        prevLat?: number;
        prevLon?: number;
        leadMinutes?: number;
        walkMinutes?: number;
        locationName?: string;
        etaAlertEnabled?: boolean;
        gpsAlertEnabled?: boolean;
        lang?: string;
        /** Unified tracking phase: 'toStop' (waiting at the boarding stop) or
         *  'toDest' (on board, counting down to the destination). The native
         *  foreground notification shows the stop ETA during 'toStop' and the
         *  destination ETA during 'toDest'. */
        phase?: string;
        /** Configured alert melody for the bus arrival ('' = default mp3). */
        busSound?: string;
        /** Configured alert melody for the get-off/stop alert ('' = default mp3). */
        stopSound?: string;
    }): Promise<{ success: boolean }>;
    stopTracking(): Promise<{ success: boolean }>;
    isTracking(): Promise<{ isTracking: boolean }>;
}

export const NativeBackgroundTracker = registerPlugin<BackgroundTrackerPlugin>('BackgroundTracker');

export interface BackgroundAlertConfig {
    enabled: boolean;
    /** Minutes before the bus arrives to fire the alert (0 = on arrival). */
    leadMinutes: number;
    /** Polling interval in seconds for the background check (default 20). */
    intervalSeconds: number;
}

const CONFIG_KEY = 'buscoruna_bg_alert_config';
const STATE_KEY = 'buscoruna_bg_alert_state';

export const DEFAULT_BG_CONFIG: BackgroundAlertConfig = {
    enabled: true,
    leadMinutes: 2,
    intervalSeconds: 20,
};

export function isNativePlatform(): boolean {
    return Capacitor.isNativePlatform();
}

export async function getBgConfig(): Promise<BackgroundAlertConfig> {
    const { value } = await Preferences.get({ key: CONFIG_KEY });
    if (!value) return { ...DEFAULT_BG_CONFIG };
    try {
        return { ...DEFAULT_BG_CONFIG, ...JSON.parse(value) };
    } catch {
        return { ...DEFAULT_BG_CONFIG };
    }
}

export async function setBgConfig(config: Partial<BackgroundAlertConfig>): Promise<BackgroundAlertConfig> {
    const current = await getBgConfig();
    const next = { ...current, ...config };
    await Preferences.set({ key: CONFIG_KEY, value: JSON.stringify(next) });
    return next;
}

interface BgAlertState {
    tracking: TrackingInfo | null;
    triggered: boolean;
    lastNotifiedEta: number | null;
}

async function getState(): Promise<BgAlertState> {
    const { value } = await Preferences.get({ key: STATE_KEY });
    if (!value) return { tracking: null, triggered: false, lastNotifiedEta: null };
    try {
        return JSON.parse(value);
    } catch {
        return { tracking: null, triggered: false, lastNotifiedEta: null };
    }
}

async function setState(state: BgAlertState) {
    await Preferences.set({ key: STATE_KEY, value: JSON.stringify(state) });
}

// ---------------------------------------------------------------------------
// Permissions
// ---------------------------------------------------------------------------

export async function requestBgAlertPermission(): Promise<boolean> {
    if (!isNativePlatform()) return Notification.permission === 'granted';
    const status = await LocalNotifications.requestPermissions();
    return status.display === 'granted';
}

export async function checkBgAlertPermission(): Promise<boolean> {
    if (!isNativePlatform()) return Notification.permission === 'granted';
    const status = await LocalNotifications.checkPermissions();
    return status.display === 'granted';
}

// ---------------------------------------------------------------------------
// Schedule the native background check
// ---------------------------------------------------------------------------

const BG_TASK_ID = 'buscoruna-arrival-check';

/**
 * Arm (or disarm) the native periodic background check.
 * The schedule persists across reboots until cancelled.
 */
export async function scheduleBackgroundCheck(config?: BackgroundAlertConfig) {
    if (!isNativePlatform()) return;
    const cfg = config ?? (await getBgConfig());

    // Cancel any existing schedule first.
    await LocalNotifications.cancel({
        notifications: [{ id: 424242, schedule: { at: new Date() } } as any],
    }).catch(() => { /* ignore if not scheduled */ });

    if (!cfg.enabled) return;

    await LocalNotifications.schedule({
        notifications: [
            {
                id: 424242,
                title: 'Coruña Bus',
                body: '...',
                schedule: {
                    // Repeating interval cannot be shorter than one minute
                    every: 'minute' as any,
                    allowWhileIdle: true,
                },
                actionTypeId: '',
                extra: { backgroundTask: BG_TASK_ID },
                // Never actually shown; the runner replaces/cancels it and fires
                // the real ETA notification instead.
            },
        ],
    });
}

export async function cancelBackgroundCheck() {
    if (!isNativePlatform()) return;
    await setBgConfig({ enabled: false });
    await LocalNotifications.cancel({
        notifications: [{ id: 424242, schedule: { at: new Date() } } as any],
    }).catch(() => { /* ignore */ });
}

// ---------------------------------------------------------------------------
// Shared check used by BOTH the foreground JS interval and (on native) the
// background task handler. Reads tracking info from Preferences (native) or
// localStorage (web), queries the stop arrivals API, and returns notification
// payload if the bus is within the lead window.
// ---------------------------------------------------------------------------

export interface ArrivalCheckResult {
    shouldNotify: boolean;
    title: string;
    body: string;
    etaMinutes: number;
}

export async function checkArrival(
    info: TrackingInfo,
    fetchArrivals: (stopId: number) => Promise<any>,
    lang: 'es' | 'en',
): Promise<ArrivalCheckResult> {
    const cfg = await getBgConfig();
    const state = await getState();
    const notFound: ArrivalCheckResult = { shouldNotify: false, title: '', body: '', etaMinutes: -1 };

    // Walking head-start from the saved departure location: while waiting for
    // the bus ('toStop') the user must leave home/work with enough margin, so
    // the alert fires at the walking time BEFORE the arrival, not at the
    // generic lead. Once on board ('toDest') this origin alert no longer
    // applies, only the plain lead would be relevant (and there is none).
    // Antelación de caminata desde la ubicación guardada: mientras se espera
    // al bus ('toStop') se avisa con el tiempo de caminata de margen.
    const { walkMinutes, locationName } = getWalkHeadStart(info);
    const isWaiting = (info.phase || 'toStop') !== 'toDest';
    const effectiveLead =
        isWaiting && walkMinutes > 0
            ? Math.max(cfg.leadMinutes, walkMinutes)
            : cfg.leadMinutes;

    try {
        const data = await fetchArrivals(info.originStopId);
        if (!data || data.resultado !== 'OK' || !data.buses || !Array.isArray(data.buses.lineas)) {
            return notFound;
        }
        const lineInfo = data.buses.lineas.find(
            (bl: any) => bl.linea.toString() === info.lineId.toString(),
        );
        if (!lineInfo || !Array.isArray(lineInfo.buses)) return notFound;

        const bus = lineInfo.buses.find(
            (b: any) => b.bus && b.bus.toString() === info.busId.toString(),
        );
        if (!bus) return notFound; // bus passed or no longer tracked

        const waitTime = typeof bus.tiempo === 'number' ? bus.tiempo : parseInt(bus.tiempo);
        if (isNaN(waitTime)) return notFound;

        // Share the triggered flag with the in-app updater (updatePhaseToStop)
        // so both systems don't double-notify: whichever fires first wins.
        // Compartimos el flag con el actualizador en la app para no avisar dos
        // veces: gana el primero que dispare.
        const webTriggered =
            !isNativePlatform() &&
            localStorage.getItem('buscoruna_eta_alert_triggered') === 'true';
        if (state.triggered || webTriggered) return notFound;

        // Fire when remaining time drops to or below the configured lead time
        // (which includes the walking head-start while waiting).
        if (waitTime <= effectiveLead) {
            const title = lang === 'en' ? '🚌 Your bus is arriving!' : '🚌 ¡Tu autobús está llegando!';
            const body =
                isWaiting && walkMinutes > 0 && locationName
                    ? lang === 'en'
                        ? `Bus ${info.busId} arrives at your stop in ${waitTime} min. It takes ${walkMinutes} min from ${locationName}. Leave now!`
                        : `El bus ${info.busId} llega a tu parada en ${waitTime} min. Tardas ${walkMinutes} min desde ${locationName}. ¡Sal ahora!`
                    : lang === 'en'
                        ? `Bus ${info.busId} arrives at your stop in ${waitTime} min.`
                        : `El bus ${info.busId} llega a tu parada en ${waitTime} min.`;

            // Mark triggered so we don't spam every interval.
            localStorage.setItem('buscoruna_eta_alert_triggered', 'true');
            await setState({ ...state, triggered: true, lastNotifiedEta: waitTime });

            return { shouldNotify: true, title, body, etaMinutes: waitTime };
        }
        return notFound;
    } catch (err) {
        console.warn('[BackgroundAlerts] check failed', err);
        return notFound;
    }
}

/** Reset the triggered flag whenever a new journey starts. */
export async function resetAlertState(info: TrackingInfo | null) {
    await setState({ tracking: info, triggered: false, lastNotifiedEta: null });
}

// ---------------------------------------------------------------------------
// Foreground-only: fast in-app interval that supplements the native schedule
// when the app is open, so alerts feel instant while using the app.
// ---------------------------------------------------------------------------

let fgInterval: any = null;

export async function startForegroundChecker(
    fetchArrivals: (stopId: number) => Promise<any>,
    notify: (title: string, body: string) => void,
) {
    stopForegroundChecker();
    const cfg = await getBgConfig();
    if (!cfg.enabled) return;

    const run = async () => {
        const info = isNativePlatform() ? (await getState()).tracking : tracking.get();
        if (!info) return;
        const lang = (localStorage.getItem('buscoruna_lang') === 'en' ? 'en' : 'es') as 'es' | 'en';
        const result = await checkArrival(info, fetchArrivals, lang);
        if (result.shouldNotify) notify(result.title, result.body);
    };

    await run();
    fgInterval = setInterval(run, Math.max(15, cfg.intervalSeconds) * 1000);
}

export function stopForegroundChecker() {
    if (fgInterval) {
        clearInterval(fgInterval);
        fgInterval = null;
    }
}

export async function startNativeBackgroundTracking(options: {
    busId: string;
    lineId: string | number;
    originStopId: number;
    originStopName?: string;
    destinationStopId: number;
    destinationStopName?: string;
    destLat?: number;
    destLon?: number;
    prevLat?: number;
    prevLon?: number;
    leadMinutes?: number;
    walkMinutes?: number;
    locationName?: string;
    etaAlertEnabled?: boolean;
    gpsAlertEnabled?: boolean;
    lang?: string;
    phase?: string;
    /** Configured alert melody for the bus arrival ('' = default mp3). */
    busSound?: string;
    /** Configured alert melody for the get-off/stop alert ('' = default mp3). */
    stopSound?: string;
}) {
    if (!isNativePlatform()) return;
    try {
        await NativeBackgroundTracker.startTracking(options);
    } catch (e) {
        console.warn('[BackgroundAlerts] Native tracker start error', e);
    }
}

export async function stopNativeBackgroundTracking() {
    if (!isNativePlatform()) return;
    try {
        await NativeBackgroundTracker.stopTracking();
    } catch (e) {
        console.warn('[BackgroundAlerts] Native tracker stop error', e);
    }
}
