package com.corunabus.app;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.widget.Button;
import android.widget.ProgressBar;
import android.widget.TextView;
import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeActivity;
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

    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Register custom native plugins
        registerPlugin(UpdateDownloaderPlugin.class);
        registerPlugin(BackgroundTrackerPlugin.class);

        // Add WebView listener so when web loads, blocked screen is dismissed
        bridgeBuilder.addWebViewListener(new WebViewListener() {
            @Override
            public void onPageLoaded(WebView webView) {
                mainHandler.post(() -> hideBlockedScreen());
            }
        });

        super.onCreate(savedInstanceState);
        WebView.setWebContentsDebuggingEnabled(true);

        setupBlockedView();
        checkAccessibilityAndReload(false);
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
                    hideBlockedScreen();
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
