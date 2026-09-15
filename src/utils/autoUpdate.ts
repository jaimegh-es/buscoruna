// In-app auto-updater for the Android (Capacitor) build.
// Checks GitHub Releases for a newer build, downloads the APK and hands it
// to the Android package installer. Also exposes a manual check used by the
// settings UI.
//
// Auto-actualizador dentro de la app para la compilación Android (Capacitor).
// Comprueba GitHub Releases, descarga el APK y lo entrega al instalador de
// Android. También expone una comprobación manual para la interfaz de ajustes.

import { Capacitor } from '@capacitor/core';

// Repo releases endpoint (update if the repo moves)
// Endpoint de releases (actualizar si cambia el repo)
const REPO = 'jaimegh-es/buscoruna';
const RELEASES_API = `https://api.github.com/repos/${REPO}/releases/latest`;

const LAST_CHECK_KEY = 'buscoruna_last_update_check';

export interface UpdateInfo {
    available: boolean;
    currentBuild: number;
    latestBuild: number;
    versionName: string;
    apkUrl: string | null;
    apkSize: number;
    releaseUrl: string;
    publishedAt: string | null;
}

function parseBuildNumber(tag: string): number {
    // Tags look like v1.0.1-42 where 42 is the GitHub run number
    // Los tags son del tipo v1.0.1-42 donde 42 es el número de ejecución
    const m = tag.match(/-(\d+)$/);
    return m ? parseInt(m[1], 10) : 0;
}

async function getNativeBuildNumber(): Promise<number> {
    if (!Capacitor.isNativePlatform()) return -1;
    try {
        const info = await (Capacitor as any).Plugins.App.getInfo();
        return parseInt(info.build, 10) || 0;
    } catch {
        return 0;
    }
}

/**
 * Query the latest GitHub release and compare with the installed build.
 * Consulta la última release de GitHub y la compara con la build instalada.
 */
export async function checkForUpdate(): Promise<UpdateInfo> {
    const empty: UpdateInfo = {
        available: false, currentBuild: -1, latestBuild: 0, versionName: '',
        apkUrl: null, apkSize: 0, releaseUrl: '', publishedAt: null,
    };
    if (!Capacitor.isNativePlatform()) return empty;

    try {
        const res = await fetch(RELEASES_API, { headers: { Accept: 'application/vnd.github+json' } });
        if (!res.ok) return empty;
        const release = await res.json();

        const latestBuild = parseBuildNumber(release.tag_name || '');
        const currentBuild = await getNativeBuildNumber();
        const asset = (release.assets || []).find((a: any) => a.name.endsWith('.apk'));

        return {
            available: !!asset && latestBuild > currentBuild,
            currentBuild,
            latestBuild,
            versionName: release.name || release.tag_name || '',
            apkUrl: asset?.browser_download_url ?? null,
            apkSize: asset?.size ?? 0,
            releaseUrl: release.html_url || '',
            publishedAt: release.published_at ?? null,
        };
    } catch (err) {
        console.warn('[AutoUpdate] check failed', err);
        return empty;
    }
}

/**
 * Automatic daily check on app open: shows a banner when a new version
 * exists. Tap it to download & install.
 *
 * Comprobación automática diaria al abrir la app: muestra un banner cuando
 * hay versión nueva. Al pulsarlo descarga e instala.
 */
export async function autoCheckOnOpen() {
    if (!Capacitor.isNativePlatform()) return;

    // Only check once per day
    // Comprobar solo una vez al día
    const last = parseInt(localStorage.getItem(LAST_CHECK_KEY) || '0', 10);
    if (Date.now() - last < 24 * 60 * 60 * 1000) return;

    const info = await checkForUpdate();
    localStorage.setItem(LAST_CHECK_KEY, Date.now().toString());
    if (!info.available) return;

    const lang = (document.documentElement.getAttribute('data-lang') || 'es');
    const message = lang === 'en'
        ? '🔄 New version available. Tap here to update.'
        : '🔄 Hay una versión nueva disponible. Pulsa aquí para actualizar.';

    // Lazy import avoids a circular dependency with inAppAlert
    const { inAppAlert } = await import('./inAppAlert');
    inAppAlert(message, {
        durationMs: 20000,
        onClick: () => downloadAndInstall(info.apkUrl!, () => {}),
    });
}

/**
 * Download the APK natively (Android DownloadManager — no CORS, progress in
 * the system notification shade) and open the local file with the package
 * installer.
 *
 * Descarga el APK de forma nativa (DownloadManager de Android — sin CORS,
 * progreso en la barra del sistema) y abre el archivo local con el
 * instalador de paquetes.
 */
export async function downloadAndInstall(
    apkUrl: string,
    onProgress: (percent: number) => void,
): Promise<void> {
    const downloader = (Capacitor as any).Plugins?.UpdateDownloader;
    if (downloader?.downloadApk) {
        // Native path: system DownloadManager + open local URI
        // Ruta nativa: DownloadManager del sistema + abrir el URI local
        await downloader.downloadApk({ url: apkUrl });

        // Wait for the download completion event (max 10 min, matching the plugin)
        // Esperar el evento de descarga completada (máx 10 min, igual que el plugin)
        const uri = await new Promise<string>((resolve, reject) => {
            const timeout = setTimeout(() => {
                cleanup();
                reject(new Error('Download timed out'));
            }, 10 * 60 * 1000);
            let doneListener: any, failListener: any;
            const cleanup = () => {
                clearTimeout(timeout);
                doneListener?.remove?.();
                failListener?.remove?.();
            };
            doneListener = downloader.addListener('downloadDone', (data: any) => {
                cleanup();
                resolve(data?.uri || '');
            });
            failListener = downloader.addListener('downloadFailed', () => {
                cleanup();
                reject(new Error('Download failed'));
            });
        });

        // Hand the downloaded file to Android's package installer
        // Entregar el archivo descargado al instalador de paquetes de Android
        const anchor = document.createElement('a');
        anchor.href = uri;
        anchor.download = 'coruna-bus-update.apk';
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        return;
    }

    // Web fallback: plain fetch + anchor (no CORS on github desktop works via redirect)
    // Fallback web: fetch normal + anchor
    const res = await fetch(apkUrl);
    if (!res.ok) throw new Error(`Download failed: ${res.status}`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'coruna-bus-update.apk';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
}
