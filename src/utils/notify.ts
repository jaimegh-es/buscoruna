// Centralized notification sender.
// On native (Capacitor/Android) uses the Local Notifications API so
// notifications appear in the system tray even with the app in background.
// On web uses the Service Worker registration with a window-Notification
// fallback.
//
// Emisor centralizado de notificaciones.
// En nativo (Capacitor/Android) usa la API de Local Notifications para que
// aparezcan en la bandeja del sistema aunque la app esté en segundo plano.
// En web usa el Service Worker con fallback a window.Notification.

import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

let nativeChannelReady = false;

async function ensureNativeChannel() {
    if (nativeChannelReady) return;
    try {
        await (LocalNotifications as any).createChannel({
            id: 'buscoruna-alerts',
            name: 'Avisos de bus',
            description: 'Avisos de llegada de bus y destino',
            importance: 5, // IMPORTANCE_HIGH: heads-up + sound
            visibility: 1, // PUBLIC
            sound: 'notify.wav',
            vibration: true,
        });
        nativeChannelReady = true;
    } catch (err) {
        // Channel may already exist or API not available; not fatal.
        // El canal puede existir ya o la API no estar disponible; no es fatal.
        console.warn('[Notify] channel creation skipped', err);
        nativeChannelReady = true;
    }
}

/**
 * Send a notification. Returns a function that dismisses it (no-op when the
 * notification could not be shown): lets callers auto-expire alerts, e.g. the
 * get-off notification closes itself 1 minute after being emitted.
 *
 * Envía una notificación. Devuelve una función que la cierra (sin efecto si la
 * notificación no se pudo mostrar): permite cerrar avisos automáticamente,
 * p. ej. la notificación de bajada se cierra sola 1 minuto después de emitirse.
 */
export async function notify(title: string, body: string, opts: { id?: number; silent?: boolean } = {}): Promise<() => void> {
    const { id = Math.floor(Math.random() * 100000), silent = false } = opts;

    // Native: system tray notification via the Android notification API
    // Nativo: notificación en bandeja del sistema vía la API de Android
    if (Capacitor.isNativePlatform()) {
        const perm = await LocalNotifications.checkPermissions();
        if (perm.display !== 'granted') {
            const req = await LocalNotifications.requestPermissions();
            if (req.display !== 'granted') {
                console.warn('[Notify] permission denied on native');
                return () => {};
            }
        }
        await ensureNativeChannel();
        await LocalNotifications.schedule({
            notifications: [{
                id,
                title,
                body,
                channelId: 'buscoruna-alerts',
                schedule: { at: new Date(Date.now() + 50) }, // fire immediately
                sound: silent ? undefined : 'notify.wav',
                actionTypeId: '',
                extra: { source: 'buscoruna' },
            }],
        });
        return () => {
            LocalNotifications.removeDeliveredNotifications({ notifications: [{ id }] } as any).catch(() => {});
        };
    }

    // Web: service worker notification (works when page is hidden on desktop)
    // Web: notificación del Service Worker (funciona con la página oculta)
    if ('Notification' in window && Notification.permission === 'granted') {
        try {
            if ('serviceWorker' in navigator) {
                const reg = await Promise.race([
                    navigator.serviceWorker.ready,
                    new Promise<ServiceWorkerRegistration>((_, reject) =>
                        setTimeout(() => reject(new Error('SW timeout')), 5000),
                    ),
                ]);
                const tag = `buscoruna-${id}`;
                await reg.showNotification(title, { body, icon: '/logo.png', badge: '/logo.png', silent, tag });
                return () => {
                    reg.getNotifications({ tag }).then((ns) => ns.forEach((n) => n.close())).catch(() => {});
                };
            }
        } catch (err) {
            console.warn('[Notify] SW unavailable, falling back', err);
        }
        try {
            const notif = new Notification(title, { body, icon: '/logo.png', silent });
            return () => notif.close();
        } catch (e) {
            console.error('[Notify] window.Notification failed', e);
        }
    }
    return () => {};
}
