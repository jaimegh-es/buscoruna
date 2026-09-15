package com.corunabus.app;

import android.app.DownloadManager;
import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.Settings;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import androidx.core.content.FileProvider;
import java.io.File;

/**
 * Native APK downloader using Android's DownloadManager.
 * Avoids WebView CORS entirely: the download is performed by the OS itself,
 * with system progress, and it then opens the package installer directly
 * (redirecting the user to the "install unknown apps" settings screen first
 * if permission has not been granted yet).
 *
 * Descarga nativa de APKs usando el DownloadManager de Android.
 * Evita por completo el CORS del WebView: la descarga la hace el propio
 * sistema, con progreso, y luego abre directamente el instalador de paquetes
 * (redirigiendo antes a los ajustes de "instalar apps desconocidas" si aún
 * no se ha dado permiso).
 */
@CapacitorPlugin(name = "UpdateDownloader")
public class UpdateDownloaderPlugin extends Plugin {

    private static final String APK_DIR = "CorunaBus";

    @PluginMethod
    public void downloadApk(PluginCall call) {
        String url = call.getString("url");
        if (url == null || url.isEmpty()) {
            call.reject("Missing url");
            return;
        }

        Context ctx = getContext();
        DownloadManager dm = (DownloadManager) ctx.getSystemService(Context.DOWNLOAD_SERVICE);
        if (dm == null) {
            call.reject("DownloadManager unavailable");
            return;
        }

        // Remove any previous update APK so the download starts clean
        // Eliminar cualquier APK anterior para que la descarga empiece limpia
        File destDir = new File(ctx.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS), APK_DIR);
        File[] old = destDir.listFiles((d, name) -> name.endsWith(".apk"));
        if (old != null) {
            for (File f : old) f.delete();
        }

        DownloadManager.Request req = new DownloadManager.Request(Uri.parse(url));
        req.setTitle("Coruña Bus — actualización");
        req.setDescription("Descargando la nueva versión de la app");
        req.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
        req.setDestinationInExternalFilesDir(ctx, Environment.DIRECTORY_DOWNLOADS, APK_DIR + "/update.apk");
        req.setMimeType("application/vnd.android.package-archive");

        long downloadId;
        try {
            downloadId = dm.enqueue(req);
        } catch (Exception e) {
            call.reject("Enqueue failed: " + e.getMessage());
            return;
        }

        final long id = downloadId;
        new Thread(() -> {
            try {
                int attempts = 0;
                while (attempts < 60 * 10) { // max ~10 min
                    Thread.sleep(1000);
                    attempts++;

                    DownloadManager.Query q = new DownloadManager.Query().setFilterById(id);
                    Cursor c = dm.query(q);
                    if (c == null) continue;
                    if (!c.moveToFirst()) { c.close(); continue; }
                    int status = c.getInt(c.getColumnIndex(DownloadManager.COLUMN_STATUS));
                    int reason = c.getInt(c.getColumnIndex(DownloadManager.COLUMN_REASON));
                    c.close();

                    if (status == DownloadManager.STATUS_SUCCESSFUL) {
                        JSObject ret = new JSObject();
                        ret.put("downloadId", id);
                        notifyListeners("downloadDone", ret);
                        openInstaller();
                        return;
                    } else if (status == DownloadManager.STATUS_FAILED) {
                        JSObject ret = new JSObject();
                        ret.put("reason", reason);
                        notifyListeners("downloadFailed", ret);
                        return;
                    }

                    // Emit download progress (bytes downloaded / total)
                    // Emitir progreso de descarga (bytes descargados / total)
                    if (status == DownloadManager.STATUS_RUNNING) {
                        Cursor pc = dm.query(q);
                        if (pc != null) {
                            if (pc.moveToFirst()) {
                                long bytes = pc.getLong(pc.getColumnIndex(DownloadManager.COLUMN_BYTES_DOWNLOADED_SO_FAR));
                                long total = pc.getLong(pc.getColumnIndex(DownloadManager.COLUMN_TOTAL_SIZE_BYTES));
                                if (total > 0) {
                                    JSObject prog = new JSObject();
                                    prog.put("percent", (int) Math.min(100, bytes * 100 / total));
                                    prog.put("bytes", bytes);
                                    prog.put("total", total);
                                    notifyListeners("downloadProgress", prog);
                                }
                            }
                            pc.close();
                        }
                    }
                }
                // Timed out
                JSObject ret = new JSObject();
                ret.put("reason", -1);
                notifyListeners("downloadFailed", ret);
            } catch (InterruptedException ignored) {
            }
        }).start();

        JSObject ret = new JSObject();
        ret.put("downloadId", downloadId);
        call.resolve(ret);
    }

    /**
     * Open the downloaded APK with the system package installer.
     * If "install unknown apps" permission is missing, redirect the user to
     * the settings screen; after granting, they can tap the update again.
     *
     * Abre el APK descargado con el instalador del sistema.
     * Si falta el permiso de "instalar apps desconocidas", redirige al usuario
     * a la pantalla de ajustes; tras concederlo, puede pulsar actualizar otra vez.
     */
    private void openInstaller() {
        Context ctx = getContext();
        File apk = new File(ctx.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS), APK_DIR + "/update.apk");
        if (!apk.exists()) {
            notifyListeners("downloadFailed", new JSObject());
            return;
        }

        // Android 8+ requires the "install unknown apps" permission
        // Android 8+ requiere el permiso de "instalar apps desconocidas"
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && !ctx.getPackageManager().canRequestPackageInstalls()) {
            try {
                Intent settings = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                        Uri.parse("package:" + ctx.getPackageName()));
                settings.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                ctx.startActivity(settings);
            } catch (ActivityNotFoundException e) {
                Intent general = new Intent(Settings.ACTION_SECURITY_SETTINGS);
                general.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                ctx.startActivity(general);
            }
            // Tell JS that a permission step is needed (banner UI can hint the user)
            // Avisar al JS de que hace falta un paso de permisos
            JSObject perm = new JSObject();
            perm.put("needsPermission", true);
            notifyListeners("installPermissionNeeded", perm);
            return;
        }

        Uri apkUri;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            // FileProvider URI: the installer process needs explicit read access
            // URI del FileProvider: el instalador necesita acceso de lectura explícito
            apkUri = FileProvider.getUriForFile(ctx, ctx.getPackageName() + ".fileprovider", apk);
        } else {
            apkUri = Uri.fromFile(apk);
        }

        Intent install = new Intent(Intent.ACTION_VIEW);
        install.setDataAndType(apkUri, "application/vnd.android.package-archive");
        install.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_GRANT_READ_URI_PERMISSION);
        try {
            ctx.startActivity(install);
        } catch (ActivityNotFoundException e) {
            notifyListeners("downloadFailed", new JSObject());
        }
    }
}
