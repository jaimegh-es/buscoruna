package com.corunabus.app;

import android.os.Bundle;
import android.util.Log;
import android.webkit.ConsoleMessage;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "CorunaBusApp";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        WebView.setWebContentsDebuggingEnabled(true);
        // Native APK downloader (system DownloadManager) for in-app updates
        // Descargador nativo de APKs (DownloadManager del sistema) para las actualizaciones
        registerPlugin(UpdateDownloaderPlugin.class);
        // Native background service for live bus and GPS tracking
        // Servicio nativo en segundo plano para seguimiento de bus y GPS
        registerPlugin(BackgroundTrackerPlugin.class);
    }

    @Override
    public void onStart() {
        super.onStart();
        Bridge bridge = this.bridge;
        if (bridge != null) {
            WebView webView = bridge.getWebView();
            if (webView != null) {
                WebSettings settings = webView.getSettings();
                settings.setDomStorageEnabled(true);
                settings.setDatabaseEnabled(true);
                settings.setJavaScriptEnabled(true);
                String ua = settings.getUserAgentString();
                if (ua != null && !ua.contains("CorunaBusNative")) {
                    settings.setUserAgentString(ua + " CorunaBusNative/1.0");
                }
            }
        }
    }
}

