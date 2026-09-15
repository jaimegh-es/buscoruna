package com.corunabus.app;

import android.app.DownloadManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;

/**
 * Native APK downloader using Android's DownloadManager.
 * Avoids WebView CORS entirely: the download is performed by the OS itself,
 * with system progress in the notification shade, and hands back the local
 * content/file URI so the JS side can trigger the package installer.
 *
 * Descarga nativa de APKs usando el DownloadManager de Android.
 * Evita por completo el CORS del WebView: la descarga la hace el propio
 * sistema, con progreso en la barra de notificaciones, y devuelve el URI
 * local para que el JS lance el instalador de paquetes.
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

        // Remove any previous partially/fully downloaded update APK
        // Eliminar cualquier APK de actualización descargado antes
        try {
            File dir = new File(ctx.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS), APK_DIR);
            File[] files = dir.listFiles((d, name) -> name.endsWith(".apk"));
            if (files != null) {
                for (File f : files) f.delete();
            }
        } catch (Exception ignored) {
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

        // Wait for completion (poll status every second; APKs are small)
        // Esperar a que termine (poll cada segundo; los APK son pequeños)
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
                    int statusCol = c.getColumnIndex(DownloadManager.COLUMN_STATUS);
                    int reasonCol = c.getColumnIndex(DownloadManager.COLUMN_REASON);
                    int uriCol = c.getColumnIndex(DownloadManager.COLUMN_LOCAL_URI);
                    if (!c.moveToFirst()) { c.close(); continue; }
                    int status = c.getInt(statusCol);
                    int reason = c.getInt(reasonCol);
                    String localUri = c.getString(uriCol);
                    c.close();

                    if (status == DownloadManager.STATUS_SUCCESSFUL) {
                        JSObject ret = new JSObject();
                        ret.put("uri", localUri != null ? localUri : "");
                        ret.put("downloadId", id);
                        notifyListeners("downloadDone", ret);
                        return;
                    } else if (status == DownloadManager.STATUS_FAILED) {
                        JSObject ret = new JSObject();
                        ret.put("reason", reason);
                        notifyListeners("downloadFailed", ret);
                        return;
                    }
                    // STATUS_RUNNING / STATUS_PENDING / STATUS_PAUSED: keep waiting
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
}
