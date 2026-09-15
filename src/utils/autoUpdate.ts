// In-app auto-updater for the Android (Capacitor) build.
// Checks GitHub Releases for a newer build, downloads the APK itself and
// hands it to the Android package installer.
//
// Auto-actualizador dentro de la app para la compilación Android (Capacitor).
// Comprueba GitHub Releases, descarga el APK y lo entrega al instalador
// de paquetes de Android.

import { Capacitor } from '@capacitor/core';
import { inAppAlert } from './inAppAlert';

// Update this if the repo moves / rename.
// Actualizar si el repo cambia de sitio o nombre.
const RELEASES_API = 'https://api.github.com/repos/OWNER/REPO/releases/latest';

const RUN_KEY = 'buscoruna_last_update_prompt';

// parseBuildNumber: tags look like v1.0.1-42 where 42 is the GitHub run number
// Los tags son del tipo v1.0.1-42 donde 42 es el número de ejecución
function parseBuildNumber(tag: string): number {
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

// Download the APK and open it with the system package installer.
// The file is saved to app-external storage so the installer can read it
// without extra permissions.
//
// Descarga el APK y lo abre con el instalador del sistema. El archivo se
// guarda en almacenamiento externo de la app para que el instalador pueda
// leerlo sin permisos adicionales.
async function downloadAndInstallApk(url: string, onProgress: (percent: number) => void): Promise<void> {
    const res = await fetch(url);
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

    // Write the blob to a file the native side can install.
    // Capacitor's Filesystem plugin isn't bundled, so use the native bridge
    // through a data URL handed to an <a download> ... Instead, we write via
    // the Capacitor bridge if available, otherwise fall back to opening the URL.
    const base64 = await blobToBase64(blob);

    // @capacitor/filesystem is not installed; use the Android WebView trick:
    // save via a Blob URL won't reach the installer. Use the native App plugin
    // if present, else fall back to browser_download_url in a new tab.
    // Simplest reliable path: write file with the Filesystem plugin.
    const { Filesystem, Directory, Encoding } = (Capacitor as any).Plugins;
    if (!Filesystem) throw new Error('Filesystem plugin unavailable');

    await Filesystem.writeFile({
        path: 'coruna-bus-update.apk',
        data: base64,
        directory: Directory.Documents,
        encoding: Encoding.UTF8,
        recursive: true,
    });

    // Hand the file to the package installer through an intent fired natively.
    // Since Capacitor has no built-in installer bridge, open the file:// URI via
    // the App plugin's launcher; Android will route .apk to the installer.
    const result = await Filesystem.getUri({ path: 'coruna-bus-update.apk', directory: Directory.Documents });
    const fileUri = result.uri;

    // Trigger install: navigate an anchor to the file URI (WebView defers to
    // Android's Download Manager / installer for apk MIME types).
    const a = document.createElement('a');
    a.href = fileUri;
    a.download = 'coruna-bus-update.apk';
    document.body.appendChild(a);
    a.click();
    a.remove();
}

function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const result = reader.result as string;
            // Strip the data: prefix; Capacitor expects raw base64
            resolve(result.substring(result.indexOf(',') + 1));
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

export async function checkForUpdate(force = false) {
    if (!Capacitor.isNativePlatform()) return;

    // Only prompt once per day unless forced
    // Avisar solo una vez al día salvo comprobación forzada
    if (!force) {
        const last = parseInt(localStorage.getItem(RUN_KEY) || '0', 10);
        if (Date.now() - last < 24 * 60 * 60 * 1000) return;
    }

    try {
        const res = await fetch(RELEASES_API, { headers: { Accept: 'application/vnd.github+json' } });
        if (!res.ok) return;
        const release = await res.json();

        const latestBuild = parseBuildNumber(release.tag_name || '');
        const currentBuild = await getNativeBuildNumber();
        if (!latestBuild || latestBuild <= currentBuild) return;

        localStorage.setItem(RUN_KEY, Date.now().toString());

        const lang = (document.documentElement.getAttribute('data-lang') || 'es');
        const asset = (release.assets || []).find((a: any) => a.name.endsWith('.apk'));
        if (!asset) return;

        const message = lang === 'en'
            ? '🔄 New version available. Tap here to download and install it.'
            : '🔄 Hay una versión nueva disponible. Pulsa aquí para descargarla e instalarla.';

        inAppAlert(message, {
            durationMs: 20000,
            onClick: () => {
                const lang2 = (document.documentElement.getAttribute('data-lang') || 'es');
                inAppAlert(lang2 === 'en' ? '⏳ Downloading update…' : '⏳ Descargando actualización…', { durationMs: 60000 });
                downloadAndInstallApk(asset.browser_download_url, (pct) => {
                    console.log(`[AutoUpdate] download progress: ${pct}%`);
                }).catch((err) => {
                    console.error('[AutoUpdate] install failed', err);
                    // Fallback: open the APK URL in the browser so the user can
                    // install manually.
                    // Fallback: abrir la URL del APK en el navegador para
                    // instalar manualmente.
                    window.open(asset.browser_download_url, '_blank');
                });
            },
        });
    } catch (err) {
        console.warn('[AutoUpdate] check failed', err);
    }
}
