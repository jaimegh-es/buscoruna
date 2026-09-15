// In-app auto-updater for the Android (Capacitor) build.
// Checks GitHub Releases for a newer build, downloads the APK and hands it
// to the Android package installer. Also exposes a manual check used by the
// settings UI.
//
// Auto-actualizador dentro de la app para la compilación Android (Capacitor).
// Comprueba GitHub Releases, descarga el APK y lo entrega al instalador de
// Android. También expone una comprobación manual para la interfaz de ajustes.

import { Capacitor } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';

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
 * Download the APK (with progress) and hand it to the Android installer.
 * Descarga el APK (con progreso) y lo entrega al instalador de Android.
 */
export async function downloadAndInstall(
    apkUrl: string,
    onProgress: (percent: number) => void,
): Promise<void> {
    const res = await fetch(apkUrl);
    if (!res.ok) throw new Error(`Download failed: ${res.status}`);

    const total = parseInt(res.headers.get('content-length') || '0', 10);
    const reader = res.body?.getReader();
    if (!reader) throw new Error('No response body');

    const chunks: Uint8Array[] = [];
    let received = 0;
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        received += value.length;
        if (total > 0) onProgress(Math.round((received / total) * 100));
    }

    const blob = new Blob(chunks as BlobPart[], { type: 'application/vnd.android.package-archive' });
    const base64 = await blobToBase64(blob);

    // Write to external Documents dir so the installer can read it
    // Guardar en Documents externo para que el instalador pueda leerlo
    await Filesystem.writeFile({
        path: 'coruna-bus-update.apk',
        data: base64,
        directory: Directory.Documents,
        encoding: Encoding.UTF8,
        recursive: true,
    });

    const { uri } = await Filesystem.getUri({ path: 'coruna-bus-update.apk', directory: Directory.Documents });

    // Hand the file to Android's package installer
    // Entregar el archivo al instalador de paquetes de Android
    const anchor = document.createElement('a');
    anchor.href = uri;
    anchor.download = 'coruna-bus-update.apk';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
}

function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const result = reader.result as string;
            resolve(result.substring(result.indexOf(',') + 1));
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}
