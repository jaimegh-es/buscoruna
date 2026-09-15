package com.corunabus.app;

import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Native APK downloader (system DownloadManager) for in-app updates
        // Descargador nativo de APKs (DownloadManager del sistema) para las actualizaciones
        registerPlugin(UpdateDownloaderPlugin.class);
    }

    @Override
    public void onStart() {
        super.onStart();
        // Append a marker to the WebView User-Agent so the API proxy can
        // identify requests coming from the native app (it sends no Origin or
        // Referer headers, which the proxy's allowlist requires).
        //
        // Añadir un marcador al User-Agent del WebView para que el proxy de la
        // API identifique las peticiones de la app nativa (no envía Origin ni
        // Referer, que la lista blanca del proxy exige).
        Bridge bridge = this.bridge;
        if (bridge != null) {
            WebView webView = bridge.getWebView();
            WebSettings settings = webView.getSettings();
            String ua = settings.getUserAgentString();
            if (ua != null && !ua.contains("CorunaBusNative")) {
                settings.setUserAgentString(ua + " CorunaBusNative/1.0");
            }
        }
    }
}
