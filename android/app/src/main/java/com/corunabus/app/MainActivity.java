package com.corunabus.app;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.ProgressBar;
import android.widget.TextView;
import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebChromeClient;
import com.getcapacitor.BridgeWebViewClient;
import com.getcapacitor.WebViewListener;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "CorunaBusApp";
    private static final String DEFAULT_SERVER_URL = "https://xn--coruabus-g3a.inled.es";
    private static final String HAYAHORA_CHECKER_URL = "https://hayahora.futbol/#comprobador&domain=inled.es";
    private static final String PROTON_VPN_PACKAGE = "ch.protonvpn.android";
    private static final String GITHUB_REPO_URL = "https://github.com/jaimegh-es/buscoruna";

    private View blockedView;
    private Button btnRetry;
    private ProgressBar progressRetry;
    private TextView tvRetryStatus;
    private boolean isBlocked = false;

    // Loading splash (logo + progress bar) shown while the remote site loads.
    // Pantalla de carga (logo + barra de progreso) mientras carga la web remota.
    private View splashView;
    private ProgressBar splashProgress;
    // Smoothed splash progress: target reported by the WebView vs. the value
    // currently drawn by the ticker.
    // Progreso suavizado de la splash: objetivo informado por el WebView vs.
    // el valor que dibuja actualmente el ticker.
    private int splashTargetProgress = 0;
    private int splashShownProgress = 0;
    private boolean splashTickRunning = false;
    // Progress tick: 30 ms per frame, at most 6 % per frame (a full bar in
    // ~0.5 s once the WebView reports 100).
    // Tic del progreso: 30 ms por fotograma y como mucho 6 % por fotograma
    // (barra completa en ~0.5 s cuando elWebView informa del 100).
    private static final long SPLASH_TICK_MS = 30L;
    private static final int SPLASH_TICK_STEP = 6;
    // Whether a successful page load may dismiss the blocked (LaLiga) screen.
    // Only test-failure blocks are auto-hidden on load; load-failure blocks stay.
    // Si una carga exitosa puede ocultar la pantalla de bloqueo: solo los
    // bloqueos por fallo del test se ocultan solos; los de carga, no.
    private boolean blockAutoHideOnLoad = true;

    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Register custom native plugins
        registerPlugin(UpdateDownloaderPlugin.class);
        registerPlugin(BackgroundTrackerPlugin.class);

        // Add WebView listener so when web loads, blocked screen is dismissed
        // and the loading splash hides (page ready to show).
        // Al cargar la web se cierra la pantalla de bloqueo y la pantalla de
        // carga (la página ya está lista para mostrarse).
        bridgeBuilder.addWebViewListener(new WebViewListener() {
            @Override
            public void onPageLoaded(WebView webView) {
                mainHandler.post(() -> {
                    if (blockAutoHideOnLoad) hideBlockedScreen();
                    hideSplash();
                });
            }
        });

        super.onCreate(savedInstanceState);
        WebView.setWebContentsDebuggingEnabled(true);

        setupSplashView();
        setupBlockedView();
        setupLoadingHooks();
        checkAccessibilityAndReload(false);
    }

    // Splash view: centered logo + determinate progress bar over the light
    // background while the remote page loads. Hidden on load completion, on
    // progress 100 or when the blocked screen takes over.
    // Vista splash: logo centrado y barra de progreso sobre fondo claro
    // mientras carga la web remota. Se oculta al terminar la carga, al llegar
    // a 100 o cuando se muestra la pantalla de bloqueo.
    private void setupSplashView() {
        ViewGroup root = findViewById(android.R.id.content);
        if (root == null) return;

        splashView = getLayoutInflater().inflate(R.layout.view_splash_loading, root, false);
        splashProgress = splashView.findViewById(R.id.splash_progress);
        root.addView(splashView, new ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
    }

    private void showSplash() {
        if (splashView == null) return;
        splashView.animate().cancel();
        splashView.setAlpha(1f);
        splashView.setVisibility(View.VISIBLE);
        splashShownProgress = 0;
        splashTargetProgress = 0;
        if (splashProgress != null) splashProgress.setProgress(0);
        startSplashTicker();
    }

    private void hideSplash() {
        stopSplashTicker();
        if (splashView == null || splashView.getVisibility() != View.VISIBLE) return;
        splashView.animate().cancel();
        splashView.animate().alpha(0f).setDuration(220).withEndAction(() -> {
            splashView.setVisibility(View.GONE);
            splashView.setAlpha(1f);
        }).start();
    }

    // Smoothed progress: the WebView reports progress in coarse jumps, so the
    // bar eases towards the latest target in small steps on a short tick
    // instead of leaping. It never goes backwards and only hides the splash
    // once it has visually reached 100.
    // Progreso suavizado: el WebView informa del avance en saltos grandes, así
    // que la barra se acerca al último objetivo en pasos pequeños en lugar de
    // saltar. Nunca retrocede y solo oculta la splash cuando llega visualmente
    // a 100.
    private final Runnable splashTick = new Runnable() {
        @Override
        public void run() {
            if (splashView == null || splashView.getVisibility() != View.VISIBLE) {
                splashTickRunning = false;
                return;
            }
            if (splashShownProgress < splashTargetProgress) {
                int remaining = splashTargetProgress - splashShownProgress;
                splashShownProgress += Math.max(1, Math.min(SPLASH_TICK_STEP, remaining));
                if (splashProgress != null) splashProgress.setProgress(splashShownProgress);
                mainHandler.postDelayed(this, SPLASH_TICK_MS);
            } else if (splashTargetProgress >= 100) {
                // Bar visually full: dismiss the splash (guarded by
                // stopSplashTicker so this runs only once).
                // Barra al 100%: se cierra la splash (lo evita
                // stopSplashTicker para que solo ocurra una vez).
                hideSplash();
            } else {
                mainHandler.postDelayed(this, SPLASH_TICK_MS);
            }
        }
    };

    private void startSplashTicker() {
        if (splashTickRunning) return;
        splashTickRunning = true;
        mainHandler.post(splashTick);
    }

    private void stopSplashTicker() {
        splashTickRunning = false;
        mainHandler.removeCallbacks(splashTick);
    }

    private void updateSplashProgress(int progress) {
        if (splashView == null || splashView.getVisibility() != View.VISIBLE) return;
        // Monotonic: the bar only moves forward while the ticker glides to it.
        // Monótona: la barra solo avanza mientras el ticker se acerca a ella.
        splashTargetProgress = Math.max(splashTargetProgress, progress);
        startSplashTicker();
    }

    // Hook the WebView for splash progress (WebChromeClient) and main-frame
    // load failures (shows the Cloudflare/LaLiga blocked screen instead of a
    // broken page). Subresource errors are ignored on purpose: third-party
    // resources routinely fail during carrier blocks.
    // Engancha el WebView: progreso de la splash (WebChromeClient) y fallos de
    // carga del marco principal (muestra la pantalla de bloqueo de Cloudflare/
    // LaLiga en vez de una página rota). Los errores de subrecursos se ignoran
    // a propósito: recursos de terceros fallan habitualmente en bloqueos.
    private void setupLoadingHooks() {
        if (bridge == null || bridge.getWebView() == null) return;
        WebView wv = bridge.getWebView();

        wv.setWebChromeClient(new BridgeWebChromeClient(bridge) {
            @Override
            public void onProgressChanged(WebView view, int newProgress) {
                super.onProgressChanged(view, newProgress);
                mainHandler.post(() -> updateSplashProgress(newProgress));
            }
        });

        bridge.setWebViewClient(new BridgeWebViewClient(bridge) {
            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                super.onReceivedError(view, request, error);
                // ERROR_UNKNOWN also covers cancelled loads; skip those.
                if (request.isForMainFrame() && error.getErrorCode() != WebViewClient.ERROR_UNKNOWN) {
                    mainHandler.post(() -> onMainFrameLoadFailed());
                }
            }

            @Override
            public void onReceivedHttpError(WebView view, WebResourceRequest request, WebResourceResponse errorResponse) {
                super.onReceivedHttpError(view, request, errorResponse);
                if (request.isForMainFrame() && errorResponse.getStatusCode() >= 400) {
                    mainHandler.post(() -> onMainFrameLoadFailed());
                }
            }
        });
    }

    private void onMainFrameLoadFailed() {
        blockAutoHideOnLoad = false;
        showBlockedScreen("Load failed");
    }

    private void setupBlockedView() {
        ViewGroup root = findViewById(android.R.id.content);
        if (root == null) return;

        blockedView = getLayoutInflater().inflate(R.layout.view_cloudflare_blocked, root, false);
        blockedView.setVisibility(View.GONE);
        root.addView(blockedView, new ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));

        btnRetry = blockedView.findViewById(R.id.btn_retry_connection);
        progressRetry = blockedView.findViewById(R.id.progress_retry);
        tvRetryStatus = blockedView.findViewById(R.id.tv_retry_status);

        View btnCheckBlock = blockedView.findViewById(R.id.btn_check_block);
        if (btnCheckBlock != null) {
            btnCheckBlock.setOnClickListener(v -> openBlockChecker());
        }

        View btnOpenVpn = blockedView.findViewById(R.id.btn_open_vpn);
        if (btnOpenVpn != null) {
            btnOpenVpn.setOnClickListener(v -> openProtonVpn());
        }

        View btnOpenGithub = blockedView.findViewById(R.id.btn_open_github);
        if (btnOpenGithub != null) {
            btnOpenGithub.setOnClickListener(v -> openGithubRepository());
        }

        if (btnRetry != null) {
            btnRetry.setOnClickListener(v -> checkAccessibilityAndReload(true));
        }
    }

    private String getTargetUrl() {
        if (bridge != null && bridge.getServerUrl() != null && !bridge.getServerUrl().isEmpty()) {
            return bridge.getServerUrl();
        }
        return DEFAULT_SERVER_URL;
    }

    private boolean testUrlReachability(String urlString) {
        if (urlString == null || urlString.isEmpty()) {
            urlString = DEFAULT_SERVER_URL;
        }
        try {
            URL url = new URL(urlString);
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setConnectTimeout(4000);
            conn.setReadTimeout(4000);
            conn.setRequestMethod("GET");
            conn.setInstanceFollowRedirects(true);
            conn.setRequestProperty("User-Agent", "Mozilla/5.0 (Linux; Android) CorunaBusHealthCheck/1.0");
            int code = conn.getResponseCode();
            conn.disconnect();
            return (code >= 200 && code < 400) || code == 404;
        } catch (Exception e) {
            Log.w(TAG, "Reachability test failed for " + urlString + ": " + e.getMessage());
            return false;
        }
    }

    private void checkAccessibilityAndReload(boolean isManualRetry) {
        if (isManualRetry) {
            if (btnRetry != null) btnRetry.setEnabled(false);
            if (progressRetry != null) progressRetry.setVisibility(View.VISIBLE);
            if (tvRetryStatus != null) {
                tvRetryStatus.setVisibility(View.VISIBLE);
                tvRetryStatus.setText("Comprobando acceso a los servidores...");
                tvRetryStatus.setTextColor(0xFF94A3B8);
            }
        }

        final String urlToCheck = getTargetUrl();

        executor.execute(() -> {
            boolean accessible = testUrlReachability(urlToCheck);
            mainHandler.post(() -> {
                if (accessible) {
                    blockAutoHideOnLoad = true;
                    hideBlockedScreen();
                    showSplash();
                    if (bridge != null && bridge.getWebView() != null) {
                        WebView wv = bridge.getWebView();
                        wv.setVisibility(View.VISIBLE);
                        wv.loadUrl(urlToCheck);
                    }
                } else {
                    showBlockedScreen("Servidor inaccesible");
                    if (isManualRetry) {
                        if (btnRetry != null) btnRetry.setEnabled(true);
                        if (progressRetry != null) progressRetry.setVisibility(View.GONE);
                        if (tvRetryStatus != null) {
                            tvRetryStatus.setVisibility(View.VISIBLE);
                            tvRetryStatus.setText("Sigue bloqueado por tu operador. Activa Proton VPN e inténtalo de nuevo.");
                            tvRetryStatus.setTextColor(0xFFF87171);
                        }
                    }
                }
            });
        });
    }

    private void showBlockedScreen(String reason) {
        isBlocked = true;
        hideSplash();
        if (bridge != null && bridge.getWebView() != null) {
            WebView webView = bridge.getWebView();
            webView.stopLoading();
            webView.setVisibility(View.GONE);
        }
        if (blockedView != null) {
            blockedView.setVisibility(View.VISIBLE);
            blockedView.bringToFront();
        }
        if (progressRetry != null) {
            progressRetry.setVisibility(View.GONE);
        }
        if (btnRetry != null) {
            btnRetry.setEnabled(true);
        }
    }

    private void hideBlockedScreen() {
        isBlocked = false;
        if (blockedView != null) {
            blockedView.setVisibility(View.GONE);
        }
        if (bridge != null && bridge.getWebView() != null) {
            WebView webView = bridge.getWebView();
            webView.setVisibility(View.VISIBLE);
        }
    }

    private void openBlockChecker() {
        try {
            Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(HAYAHORA_CHECKER_URL));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(intent);
        } catch (Exception e) {
            Log.e(TAG, "Error opening block checker: " + e.getMessage());
        }
    }

    private void openProtonVpn() {
        try {
            Intent launchIntent = getPackageManager().getLaunchIntentForPackage(PROTON_VPN_PACKAGE);
            if (launchIntent != null) {
                launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                startActivity(launchIntent);
                return;
            }
        } catch (Exception ignored) {
        }

        try {
            Intent marketIntent = new Intent(Intent.ACTION_VIEW, Uri.parse("market://details?id=" + PROTON_VPN_PACKAGE));
            marketIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(marketIntent);
        } catch (Exception e) {
            try {
                Intent webIntent = new Intent(Intent.ACTION_VIEW, Uri.parse("https://play.google.com/store/apps/details?id=" + PROTON_VPN_PACKAGE));
                webIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                startActivity(webIntent);
            } catch (Exception ignored) {
            }
        }
    }

    private void openGithubRepository() {
        try {
            Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(GITHUB_REPO_URL));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(intent);
        } catch (Exception e) {
            Log.e(TAG, "Error opening GitHub repo: " + e.getMessage());
        }
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

    @Override
    public void onResume() {
        super.onResume();
        // If the blocked screen was visible, re-test connectivity automatically (e.g. user enabled VPN in background)
        if (isBlocked) {
            checkAccessibilityAndReload(false);
        }
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        executor.shutdown();
    }
}
