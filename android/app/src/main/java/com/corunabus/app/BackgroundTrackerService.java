package com.corunabus.app;

import android.Manifest;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ServiceInfo;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.media.MediaPlayer;
import android.os.Build;
import android.os.Bundle;
import android.os.IBinder;
import android.os.PowerManager;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.util.Base64;
import android.util.Log;
import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.BufferedReader;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

public class BackgroundTrackerService extends Service implements LocationListener {
    private static final String TAG = "BgTrackerService";

    public static final String ACTION_START = "com.corunabus.app.action.START_TRACKING";
    public static final String ACTION_STOP = "com.corunabus.app.action.STOP_TRACKING";

    public static final String CHANNEL_BG_ID = "buscoruna_bg_live_v2";
    public static final String CHANNEL_ALERTS_ID = "buscoruna_alerts_channel";
    // Silent high-priority channel used when a configured melody (default mp3 or
    // custom upload) plays instead of the system notification sound, avoiding a
    // double sound.
    public static final String CHANNEL_ALERTS_SILENT_ID = "buscoruna_alerts_silent_ch";

    public static final int NOTIFICATION_ID_SERVICE = 424243;
    public static final int NOTIFICATION_ID_ARRIVAL_ALERT = 9001;
    public static final int NOTIFICATION_ID_GPS_ALERT = 9002;

    public static volatile boolean isRunning = false;

    private String busId = "";
    private String lineId = "";
    private int originStopId = 0;
    private String originStopName = "";
    private int destinationStopId = 0;
    private String destinationStopName = "";
    private double destLat = 0.0;
    private double destLon = 0.0;
    private double prevLat = 0.0;
    private double prevLon = 0.0;
    private int leadMinutes = 2;
    private int walkMinutes = 0;
    private String locationName = "";
    private boolean etaAlertEnabled = true;
    private boolean gpsAlertEnabled = true;
    private String lang = "es";
    // Unified tracking phase: "toStop" = waiting at the boarding stop (show the
    // time until the bus reaches the stop), "toDest" = on board (show the time
    // to the destination). Empty for legacy single-phase journeys.
    private String phase = "";
    // Configured alert melodies: base64 data URI when the user uploaded a custom
    // mp3 from Settings, empty string = use the bundled default mp3.
    private String busSound = "";
    private String stopSound = "";

    private boolean etaTriggered = false;
    private boolean gpsTriggered = false;
    private int lastEta = -1;
    private int lastDestEta = -1;
    // Guards the self-stop scheduled after arrival so it only fires once.
    private volatile boolean stopScheduled = false;

    private ScheduledExecutorService executor;
    private PowerManager.WakeLock wakeLock;
    private LocationManager locationManager;
    private NotificationManager notificationManager;

    @Override
    public void onCreate() {
        super.onCreate();
        isRunning = true;
        notificationManager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        createNotificationChannels();

        PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
        if (pm != null) {
            wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "CorunaBus:BgTrackerWakeLock");
            try {
                wakeLock.acquire(30 * 60 * 1000L); // 30 minutes max safety limit
            } catch (Exception e) {
                Log.w(TAG, "Could not acquire wake lock", e);
            }
        }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null || ACTION_STOP.equals(intent.getAction())) {
            stopSelf();
            return START_NOT_STICKY;
        }

        if (ACTION_START.equals(intent.getAction())) {
            String newBusId = intent.getStringExtra("busId") != null ? intent.getStringExtra("busId") : "";
            int newOriginStopId = intent.getIntExtra("originStopId", 0);
            boolean isSameSession = isRunning && !busId.isEmpty() && busId.equalsIgnoreCase(newBusId) && originStopId == newOriginStopId;

            busId = newBusId;
            lineId = intent.getStringExtra("lineId") != null ? intent.getStringExtra("lineId") : "";
            originStopId = newOriginStopId;
            originStopName = intent.getStringExtra("originStopName") != null ? intent.getStringExtra("originStopName") : "";
            destinationStopId = intent.getIntExtra("destinationStopId", 0);
            destinationStopName = intent.getStringExtra("destinationStopName") != null ? intent.getStringExtra("destinationStopName") : "";
            destLat = intent.getDoubleExtra("destLat", 0.0);
            destLon = intent.getDoubleExtra("destLon", 0.0);
            prevLat = intent.getDoubleExtra("prevLat", 0.0);
            prevLon = intent.getDoubleExtra("prevLon", 0.0);
            leadMinutes = intent.getIntExtra("leadMinutes", 2);
            walkMinutes = intent.getIntExtra("walkMinutes", 0);
            locationName = intent.getStringExtra("locationName") != null ? intent.getStringExtra("locationName") : "";
            etaAlertEnabled = intent.getBooleanExtra("etaAlertEnabled", true);
            gpsAlertEnabled = intent.getBooleanExtra("gpsAlertEnabled", true);
            lang = intent.getStringExtra("lang") != null ? intent.getStringExtra("lang") : "es";
            phase = intent.getStringExtra("phase") != null ? intent.getStringExtra("phase") : "";
            // Melodies refresh on every start call (even mid-session), so a
            // change in Settings without restarting tracking takes effect.
            busSound = intent.getStringExtra("busSound") != null ? intent.getStringExtra("busSound") : "";
            stopSound = intent.getStringExtra("stopSound") != null ? intent.getStringExtra("stopSound") : "";

            if (!isSameSession) {
                etaTriggered = false;
                gpsTriggered = false;
                lastEta = -1;
                lastDestEta = -1;
                stopScheduled = false;

                startForegroundServiceNotification();
                startPollingLoop();
                startLocationListener();
            } else {
                updateForegroundNotification();
            }
        }

        return START_STICKY;
    }

    private void createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && notificationManager != null) {
            // Channel 1: Background ongoing service notification (Default priority, visible on lockscreen)
            NotificationChannel bgChannel = new NotificationChannel(
                CHANNEL_BG_ID,
                "Coruña Bus · Seguimiento activo",
                NotificationManager.IMPORTANCE_DEFAULT
            );
            bgChannel.setDescription("Seguimiento en tiempo real del autobús en pantalla de bloqueo y barra de notificaciones");
            bgChannel.setShowBadge(false);
            bgChannel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            notificationManager.createNotificationChannel(bgChannel);

            // Channel 2: High priority alerts channel for arrival, departure and destination warnings
            NotificationChannel alertsChannel = new NotificationChannel(
                CHANNEL_ALERTS_ID,
                "Coruña Bus · Avisos de autobús",
                NotificationManager.IMPORTANCE_HIGH
            );
            alertsChannel.setDescription("Avisos para salir de casa/trabajo, llegada de autobús y aviso de parada de destino");
            alertsChannel.enableVibration(true);
            alertsChannel.setVibrationPattern(new long[]{0, 400, 200, 400, 200, 400});
            alertsChannel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            alertsChannel.setShowBadge(true);
            notificationManager.createNotificationChannel(alertsChannel);

            // Silent channel: used when a configured melody is played instead of
            // the system sound (avoids double sound on arrival/get-off alerts).
            NotificationChannel silentAlertsChannel = new NotificationChannel(
                CHANNEL_ALERTS_SILENT_ID,
                "Coruña Bus · Avisos (melodía configurada)",
                NotificationManager.IMPORTANCE_HIGH
            );
            silentAlertsChannel.setDescription("Avisos con melodía configurada (sin sonido del sistema)");
            silentAlertsChannel.setSound(null, null);
            silentAlertsChannel.enableVibration(true);
            silentAlertsChannel.setVibrationPattern(new long[]{0, 400, 200, 400, 200, 400});
            silentAlertsChannel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            silentAlertsChannel.setShowBadge(true);
            notificationManager.createNotificationChannel(silentAlertsChannel);
        }
    }

    private void startForegroundServiceNotification() {
        Notification notification = buildForegroundNotification();

        boolean hasFineLoc = ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED;
        boolean hasCoarseLoc = ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED;

        if (Build.VERSION.SDK_INT >= 34) { // Android 14+
            int serviceTypes = ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC;
            if (hasFineLoc || hasCoarseLoc) {
                serviceTypes |= ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION;
            }
            try {
                startForeground(NOTIFICATION_ID_SERVICE, notification, serviceTypes);
            } catch (Exception e) {
                Log.e(TAG, "Failed startForeground with types, falling back", e);
                startForeground(NOTIFICATION_ID_SERVICE, notification);
            }
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) { // Android 10+
            int serviceTypes = (hasFineLoc || hasCoarseLoc) ? ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION : 0;
            try {
                if (serviceTypes != 0) {
                    startForeground(NOTIFICATION_ID_SERVICE, notification, serviceTypes);
                } else {
                    startForeground(NOTIFICATION_ID_SERVICE, notification);
                }
            } catch (Exception e) {
                startForeground(NOTIFICATION_ID_SERVICE, notification);
            }
        } else {
            startForeground(NOTIFICATION_ID_SERVICE, notification);
        }
    }

    private Notification buildForegroundNotification() {
        Intent openIntent = new Intent(this, MainActivity.class);
        openIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pOpenIntent = PendingIntent.getActivity(
            this, 0, openIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
        );

        Intent stopIntent = new Intent(this, BackgroundTrackerService.class);
        stopIntent.setAction(ACTION_STOP);
        PendingIntent pStopIntent = PendingIntent.getService(
            this, 1, stopIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
        );

        String origInfo = !originStopName.isEmpty() ? originStopName : ("Parada " + originStopId);
        String destInfo = !destinationStopName.isEmpty() ? destinationStopName : ("Parada " + destinationStopId);

        String title;
        String body;

        boolean waitingAtStop = "toStop".equals(phase);

        if (waitingAtStop) {
            // Phase 1: waiting for the bus at the boarding stop. Always show the
            // time remaining until the bus reaches the STOP (even when the
            // destination ETA is already known too — the user is still on the
            // platform and needs to know when to board).
            if (lastEta >= 0) {
                long etaTimeMs = System.currentTimeMillis() + lastEta * 60000L;
                java.text.SimpleDateFormat sdf = new java.text.SimpleDateFormat("HH:mm", java.util.Locale.getDefault());
                String etaClock = sdf.format(new java.util.Date(etaTimeMs));
                String timeLabel = lastEta == 0
                    ? ("en".equals(lang) ? "Arriving now!" : "¡Llegando ahora!")
                    : (lastEta + " min (" + etaClock + ")");
                title = "🚌 Bus " + busId + " · " + timeLabel;
                body = ("en".equals(lang) ? "Waiting at: " : "Esperando en: ") + origInfo
                    + " → " + ("en".equals(lang) ? "Dest: " : "Destino: ") + destInfo;
            } else {
                title = "en".equals(lang)
                    ? ("🚌 Bus " + busId + " · Looking for the bus…")
                    : ("🚌 Bus " + busId + " · Buscando bus…");
                body = ("en".equals(lang) ? "Waiting at: " : "Esperando en: ") + origInfo
                    + " → " + ("en".equals(lang) ? "Dest: " : "Destino: ") + destInfo;
            }
        } else if (destinationStopId > 0 && destinationStopId != originStopId) {
            // Mode: Journey to destination stop (phase 'toDest' or legacy)
            if (lastDestEta >= 0) {
                long etaTimeMs = System.currentTimeMillis() + lastDestEta * 60000L;
                java.text.SimpleDateFormat sdf = new java.text.SimpleDateFormat("HH:mm", java.util.Locale.getDefault());
                String etaClock = sdf.format(new java.util.Date(etaTimeMs));
                String timeLabel = lastDestEta == 0
                    ? ("en".equals(lang) ? "Arriving at destination!" : "¡Llegando a destino!")
                    : (lastDestEta + " min (" + etaClock + ")");
                title = "🚌 Bus " + busId + " → Destino · " + timeLabel;
                body = origInfo + " → " + destInfo + " (Quedan ~" + lastDestEta + " min a destino)";
            } else if (lastEta >= 0) {
                long etaTimeMs = System.currentTimeMillis() + lastEta * 60000L;
                java.text.SimpleDateFormat sdf = new java.text.SimpleDateFormat("HH:mm", java.util.Locale.getDefault());
                String etaClock = sdf.format(new java.util.Date(etaTimeMs));
                title = "🚌 Bus " + busId + " · En origen en " + lastEta + " min (" + etaClock + ")";
                body = "Esperando en: " + origInfo + " → Destino: " + destInfo;
            } else {
                title = "en".equals(lang) ? ("🚌 Bus " + busId + " → Destination") : ("🚌 Bus " + busId + " → " + destInfo);
                body = origInfo + " → " + destInfo;
            }
        } else if (lastEta >= 0) {
            // Mode: Waiting for bus at origin stop
            long etaTimeMs = System.currentTimeMillis() + lastEta * 60000L;
            java.text.SimpleDateFormat sdf = new java.text.SimpleDateFormat("HH:mm", java.util.Locale.getDefault());
            String etaClock = sdf.format(new java.util.Date(etaTimeMs));
            String timeLabel = lastEta == 0 ? ("en".equals(lang) ? "Arriving now" : "¡Llegando ahora!") : (lastEta + " min (" + etaClock + ")");
            title = "🚌 Bus " + busId + " · " + timeLabel;
            if (walkMinutes > 0 && !locationName.isEmpty()) {
                body = "Parada: " + origInfo + " · Tardas " + walkMinutes + " min desde " + locationName;
            } else {
                body = ("en".equals(lang) ? "Waiting at: " : "Esperando en: ") + origInfo;
            }
        } else {
            title = "en".equals(lang) ? ("🚌 Bus " + busId + " · Tracking active") : ("🚌 Bus " + busId + " · Seguimiento activo");
            if (walkMinutes > 0 && !locationName.isEmpty()) {
                body = "Parada: " + origInfo + " · Tardas " + walkMinutes + " min desde " + locationName;
            } else {
                body = ("en".equals(lang) ? "Waiting at: " : "Esperando en: ") + origInfo;
            }
        }

        String stopLabel = "en".equals(lang) ? "Stop" : "Detener";

        return new NotificationCompat.Builder(this, CHANNEL_BG_ID)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
            .setSubText("Coruña Bus")
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentIntent(pOpenIntent)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .addAction(android.R.drawable.ic_menu_close_clear_cancel, stopLabel, pStopIntent)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .build();
    }

    private void updateForegroundNotification() {
        if (notificationManager != null && isRunning) {
            notificationManager.notify(NOTIFICATION_ID_SERVICE, buildForegroundNotification());
        }
    }

    private void startPollingLoop() {
        if (executor != null && !executor.isShutdown()) {
            executor.shutdownNow();
        }
        executor = Executors.newSingleThreadScheduledExecutor();
        executor.scheduleWithFixedDelay(() -> {
            try {
                pollEta();
            } catch (Exception e) {
                Log.e(TAG, "Error during pollEta", e);
            }
        }, 0, 10, TimeUnit.SECONDS);
    }

    private String fetchUrl(String urlString) {
        HttpURLConnection conn = null;
        BufferedReader reader = null;
        try {
            URL url = new URL(urlString);
            conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("GET");
            conn.setConnectTimeout(8000);
            conn.setReadTimeout(8000);
            conn.setRequestProperty("User-Agent", "Mozilla/5.0 CorunaBusNative/1.0");
            conn.setRequestProperty("Accept", "application/json, text/plain, */*");

            int code = conn.getResponseCode();
            if (code == 200) {
                reader = new BufferedReader(new InputStreamReader(conn.getInputStream(), StandardCharsets.UTF_8));
                StringBuilder sb = new StringBuilder();
                String line;
                while ((line = reader.readLine()) != null) {
                    sb.append(line);
                }
                return sb.toString();
            }
        } catch (Exception e) {
            Log.w(TAG, "Fetch failed for " + urlString + ": " + e.getMessage());
        } finally {
            if (reader != null) {
                try { reader.close(); } catch (Exception ignored) {}
            }
            if (conn != null) {
                conn.disconnect();
            }
        }
        return null;
    }

    private boolean matchesLine(Object jsonLineVal, String targetLine) {
        if (jsonLineVal == null || targetLine == null) return false;
        String lStr = jsonLineVal.toString().trim();
        String tStr = targetLine.trim();
        if (lStr.equalsIgnoreCase(tStr)) return true;
        try {
            int lNum = Integer.parseInt(lStr);
            int tNum = Integer.parseInt(tStr);
            if (lNum == tNum) return true;
        } catch (Exception ignored) {}
        return false;
    }

    private boolean matchesBus(Object jsonBusVal, String targetBus) {
        if (jsonBusVal == null || targetBus == null) return false;
        return jsonBusVal.toString().trim().equalsIgnoreCase(targetBus.trim());
    }

    private int parseWaitTime(String tiempoStr) {
        if (tiempoStr == null) return -1;
        tiempoStr = tiempoStr.trim();
        if (tiempoStr.equals(">>>") || tiempoStr.equalsIgnoreCase("PRX") || tiempoStr.equalsIgnoreCase("LLEGANDO")) {
            return 0;
        }
        try {
            return Integer.parseInt(tiempoStr);
        } catch (Exception e) {
            return -1;
        }
    }

    /**
     * Stop the service a bit after arrival so the last notification/foreground
     * state is visible, without keeping the battery drain running forever.
     * Guarded so only one schedule wins.
     */
    private void scheduleStopAfter(long seconds) {
        if (stopScheduled || executor == null || executor.isShutdown()) return;
        stopScheduled = true;
        executor.schedule(() -> {
            if (isRunning) stopSelf();
        }, seconds, TimeUnit.SECONDS);
    }

    private void pollEta() {
        if (originStopId <= 0) return;

        String json = fetchUrl("https://itranvias.com/queryitr_v3.php?func=0&dato=" + originStopId);
        if (json == null) {
            json = fetchUrl("https://xn--coruabus-g3a.inled.es/api/proxy?func=0&dato=" + originStopId);
        }

        if (json != null) {
            try {
                JSONObject obj = new JSONObject(json);
                if ("OK".equalsIgnoreCase(obj.optString("resultado"))) {
                    JSONObject buses = obj.optJSONObject("buses");
                    if (buses != null) {
                        JSONArray lineas = buses.optJSONArray("lineas");
                        if (lineas != null) {
                            boolean originFound = false;
                            for (int i = 0; i < lineas.length(); i++) {
                                JSONObject lineaObj = lineas.getJSONObject(i);
                                Object lineVal = lineaObj.opt("linea");
                                if (!matchesLine(lineVal, lineId)) continue;

                                JSONArray busArray = lineaObj.optJSONArray("buses");
                                if (busArray == null) continue;

                                for (int j = 0; j < busArray.length(); j++) {
                                    JSONObject bObj = busArray.getJSONObject(j);
                                    Object bVal = bObj.opt("bus");
                                    if (matchesBus(bVal, busId)) {
                                        originFound = true;
                                        String tStr = bObj.optString("tiempo", "");
                                        int waitTime = parseWaitTime(tStr);
                                        if (waitTime >= 0) {
                                            lastEta = waitTime;
                                            updateForegroundNotification();

                                            if (etaAlertEnabled && !etaTriggered) {
                                                int alertThreshold = walkMinutes > 0 ? walkMinutes : leadMinutes;
                                                if (waitTime <= alertThreshold) {
                                                    etaTriggered = true;
                                                    if (walkMinutes > 0 && !locationName.isEmpty()) {
                                                        fireWalkDepartureAlert(waitTime, walkMinutes, locationName);
                                                    } else {
                                                        fireArrivalAlert(waitTime);
                                                    }
                                                }
                                            }

                                            // "Alert only" journeys (origin ==
                                            // destination) finish automatically
                                            // once the bus is at the stop.
                                            // Modo "solo aviso": termina solo
                                            // cuando el bus está en la parada.
                                            if (destinationStopId == originStopId && waitTime == 0) {
                                                scheduleStopAfter(45);
                                            }
                                        }
                                        break;
                                    }
                                }
                            }
                            // Alert-only journey whose arrival alert already fired
                            // and whose bus is no longer listed (it arrived or
                            // passed): finish, otherwise the service would keep
                            // polling forever.
                            // Viaje "solo aviso" cuyo aviso ya se lanzó y el bus ya
                            // no aparece (llegó o pasó): se acaba el seguimiento,
                            // si no, el servicio seguiría sondeando sin fin.
                            if (destinationStopId == originStopId && !originFound && etaTriggered) {
                                scheduleStopAfter(30);
                            }
                        }
                    }
                }
            } catch (Exception e) {
                Log.w(TAG, "Error parsing origin ETA JSON", e);
            }
        }

        // Also check destination stop ETA if destination is set and distinct from origin
        if (destinationStopId > 0 && destinationStopId != originStopId) {
            String destJson = fetchUrl("https://itranvias.com/queryitr_v3.php?func=0&dato=" + destinationStopId);
            if (destJson == null) {
                destJson = fetchUrl("https://xn--coruabus-g3a.inled.es/api/proxy?func=0&dato=" + destinationStopId);
            }
            if (destJson != null) {
                try {
                    JSONObject dObj = new JSONObject(destJson);
                    if ("OK".equalsIgnoreCase(dObj.optString("resultado"))) {
                        JSONObject dBuses = dObj.optJSONObject("buses");
                        if (dBuses != null) {
                            JSONArray dLineas = dBuses.optJSONArray("lineas");
                            if (dLineas != null) {
                                boolean destFound = false;
                                for (int i = 0; i < dLineas.length(); i++) {
                                    JSONObject dLineaObj = dLineas.getJSONObject(i);
                                    if (!matchesLine(dLineaObj.opt("linea"), lineId)) continue;
                                    JSONArray dBusArray = dLineaObj.optJSONArray("buses");
                                    if (dBusArray == null) continue;
                                    for (int j = 0; j < dBusArray.length(); j++) {
                                        JSONObject db = dBusArray.getJSONObject(j);
                                        if (matchesBus(db.opt("bus"), busId)) {
                                            int dTime = parseWaitTime(db.optString("tiempo", ""));
                                            if (dTime >= 0) {
                                                destFound = true;
                                                lastDestEta = dTime;
                                                updateForegroundNotification();
                                                if (dTime <= 2 && !gpsTriggered) {
                                                    gpsTriggered = true;
                                                    fireDestinationAlert();
                                                }
                                                // The bus is at the destination
                                                // stop: the journey is over.
                                                // El bus está en la parada de
                                                // destino: viaje terminado.
                                                if (dTime == 0) {
                                                    scheduleStopAfter(45);
                                                }
                                            }
                                            break;
                                        }
                                    }
                                }
                                // The destination feed stopped reporting the bus
                                // right after it was within 1-2 min (or after the
                                // "press the stop button" alert fired): it reached
                                // the terminus, finish instead of polling forever.
                                // El feed de destino deja de listar el bus justo
                                // cuando estaba a 1-2 min (o tras avisar de bajada):
                                // llegó a la cabecera; se acaba el sondeo.
                                if (!destFound && (gpsTriggered || (lastDestEta >= 0 && lastDestEta <= 2))) {
                                    scheduleStopAfter(60);
                                }
                            }
                        }
                    }
                } catch (Exception e) {
                    Log.w(TAG, "Error checking dest ETA", e);
                }
            }
        }
    }

    /**
     * Play the configured melody for an alert.
     * `soundConfig` is either a base64 data URI (custom upload) or empty (use
     * the bundled default mp3, copied by `npx cap sync` from /public into
     * android assets). Returns false when nothing could be played, so the
     * caller falls back to the system notification sound.
     * Reproduce la melodía configurada: data URI base64 personalizada o el mp3
     * por defecto incluido en los assets. false si no se pudo reproducir.
     */
    private boolean playMelody(String soundConfig, String assetPath) {
        try {
            MediaPlayer player = new MediaPlayer();
            if (soundConfig != null && !soundConfig.isEmpty()) {
                // Custom base64 data URI (data:audio/mpeg;base64,....)
                String b64 = soundConfig;
                int comma = b64.indexOf(',');
                if (comma != -1) b64 = b64.substring(comma + 1);
                byte[] data = Base64.decode(b64, Base64.DEFAULT);
                if (data.length == 0 || data.length > 5 * 1024 * 1024) return false;
                String fileName = assetPath.contains("avisoparada")
                    ? "corunabus_stop_alert.mp3" : "corunabus_bus_alert.mp3";
                File f = new File(getCacheDir(), fileName);
                FileOutputStream fos = new FileOutputStream(f);
                try {
                    fos.write(data);
                } finally {
                    fos.close();
                }
                player.setDataSource(f.getAbsolutePath());
            } else {
                player.setDataSource("file:///android_asset/" + assetPath);
            }
            player.setOnPreparedListener(MediaPlayer::start);
            player.setOnCompletionListener(MediaPlayer::release);
            player.setOnErrorListener((mp, what, extra) -> { mp.release(); return true; });
            player.prepareAsync();
            return true;
        } catch (Exception e) {
            Log.w(TAG, "Could not play melody " + assetPath, e);
            return false;
        }
    }

    private void fireWalkDepartureAlert(int minutesLeft, int walkMins, String locName) {
        Intent openIntent = new Intent(this, MainActivity.class);
        openIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pOpenIntent = PendingIntent.getActivity(
            this, 4, openIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
        );

        String title = "en".equals(lang) ? "⏰ Time to leave for the bus stop!" : "⏰ ¡Hora de salir hacia la parada!";
        String stopName = !originStopName.isEmpty() ? originStopName : ("Parada " + originStopId);
        String body = "en".equals(lang)
            ? ("Bus " + busId + " arrives at " + stopName + " in " + minutesLeft + " min. It takes " + walkMins + " min from " + locName + ". Leave now!")
            : ("El bus " + busId + " llega a " + stopName + " en " + minutesLeft + " min. Tardas " + walkMins + " min desde " + locName + ". ¡Sal ahora!");

        boolean melody = playMelody(busSound, "public/avisobus.mp3");
        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, melody ? CHANNEL_ALERTS_SILENT_ID : CHANNEL_ALERTS_ID)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentIntent(pOpenIntent)
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setVibrate(new long[]{0, 500, 250, 500, 250, 500});
        if (!melody) builder.setDefaults(NotificationCompat.DEFAULT_ALL);

        if (notificationManager != null) {
            notificationManager.notify(NOTIFICATION_ID_ARRIVAL_ALERT, builder.build());
        }
        vibrateDevice();
    }

    private void fireArrivalAlert(int minutesLeft) {
        Intent openIntent = new Intent(this, MainActivity.class);
        openIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pOpenIntent = PendingIntent.getActivity(
            this, 2, openIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
        );

        String title = "en".equals(lang) ? "🚌 Your bus is arriving!" : "🚌 ¡Tu autobús está llegando!";
        String stopName = !originStopName.isEmpty() ? originStopName : ("Parada " + originStopId);
        String body = "en".equals(lang)
            ? ("Bus " + busId + " arrives at " + stopName + " in " + minutesLeft + " min. Board the bus!")
            : ("El bus " + busId + " llega a " + stopName + " en " + minutesLeft + " min. ¡Sube al bus!");

        boolean melody = playMelody(busSound, "public/avisobus.mp3");
        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, melody ? CHANNEL_ALERTS_SILENT_ID : CHANNEL_ALERTS_ID)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentIntent(pOpenIntent)
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setVibrate(new long[]{0, 400, 200, 400, 200, 400});
        if (!melody) builder.setDefaults(NotificationCompat.DEFAULT_ALL);

        if (notificationManager != null) {
            notificationManager.notify(NOTIFICATION_ID_ARRIVAL_ALERT, builder.build());
        }
        vibrateDevice();
    }

    private void fireDestinationAlert() {
        Intent openIntent = new Intent(this, MainActivity.class);
        openIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pOpenIntent = PendingIntent.getActivity(
            this, 3, openIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0)
        );

        String title = "en".equals(lang) ? "⚠️ PRESS THE STOP BUTTON!" : "⚠️ ¡PULSA EL BOTÓN DE PARADA!";
        String destName = !destinationStopName.isEmpty() ? destinationStopName : ("Parada " + destinationStopId);
        String body = "en".equals(lang)
            ? ("Approaching your destination: " + destName + ". Alert the driver to get off!")
            : ("Te aproximas a tu destino: " + destName + ". ¡Avisa al conductor para bajarte!");

        boolean melody = playMelody(stopSound, "public/avisoparada.mp3");
        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, melody ? CHANNEL_ALERTS_SILENT_ID : CHANNEL_ALERTS_ID)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentIntent(pOpenIntent)
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setVibrate(new long[]{0, 500, 200, 500, 200, 500});
        if (!melody) builder.setDefaults(NotificationCompat.DEFAULT_ALL);

        if (notificationManager != null) {
            notificationManager.notify(NOTIFICATION_ID_GPS_ALERT, builder.build());
        }
        vibrateDevice();
    }

    private void vibrateDevice() {
        try {
            Vibrator v = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
            if (v != null && v.hasVibrator()) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    v.vibrate(VibrationEffect.createWaveform(new long[]{0, 400, 200, 400, 200, 400}, -1));
                } else {
                    v.vibrate(new long[]{0, 400, 200, 400, 200, 400}, -1);
                }
            }
        } catch (Exception ignored) {}
    }

    private void startLocationListener() {
        if (!gpsAlertEnabled || destLat == 0.0 || destLon == 0.0 || originStopId == destinationStopId) {
            return;
        }

        try {
            boolean hasFine = ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED;
            boolean hasCoarse = ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED;

            if (!hasFine && !hasCoarse) return;

            locationManager = (LocationManager) getSystemService(Context.LOCATION_SERVICE);
            if (locationManager == null) return;

            if (locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER)) {
                locationManager.requestLocationUpdates(LocationManager.GPS_PROVIDER, 5000, 5, this);
            }
            if (locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)) {
                locationManager.requestLocationUpdates(LocationManager.NETWORK_PROVIDER, 5000, 5, this);
            }
        } catch (SecurityException se) {
            Log.w(TAG, "Location permission missing", se);
        } catch (Exception e) {
            Log.w(TAG, "Error starting location updates", e);
        }
    }

    @Override
    public void onLocationChanged(Location location) {
        if (location == null || gpsTriggered || destLat == 0.0 || destLon == 0.0) return;

        float[] results = new float[1];
        Location.distanceBetween(location.getLatitude(), location.getLongitude(), destLat, destLon, results);
        float distToDest = results[0];

        boolean atPrev = false;
        boolean passedPrev = false;
        if (prevLat != 0.0 && prevLon != 0.0) {
            float[] prevResults = new float[1];
            Location.distanceBetween(location.getLatitude(), location.getLongitude(), prevLat, prevLon, prevResults);
            float distToPrev = prevResults[0];

            float[] prevToDestResults = new float[1];
            Location.distanceBetween(prevLat, prevLon, destLat, destLon, prevToDestResults);
            float distPrevToDest = Math.max(80f, prevToDestResults[0]);

            // Spacing-aware thresholds: with very close stops the alert must not
            // fire too early or from the wrong stop. It only fires at the
            // second-to-last stop, or once the user is clearly closer to the
            // destination than to that stop.
            // Umbrales acordes a la distancia real entre paradas.
            atPrev = distToPrev < Math.min(100f, distPrevToDest * 0.45f);
            passedPrev = (distToDest < distToPrev) && (distToDest < Math.max(70f, distPrevToDest * 0.5f));
        }

        // Only when the previous stop could not be resolved, fall back to a
        // plain proximity check.
        boolean approachingDest = (prevLat == 0.0 && prevLon == 0.0) && distToDest < 150;

        if (atPrev || passedPrev || approachingDest) {
            gpsTriggered = true;
            fireDestinationAlert();
        }
    }

    @Override public void onStatusChanged(String provider, int status, Bundle extras) {}
    @Override public void onProviderEnabled(String provider) {}
    @Override public void onProviderDisabled(String provider) {}

    @Override
    public void onDestroy() {
        isRunning = false;
        if (executor != null) {
            executor.shutdownNow();
            executor = null;
        }
        if (locationManager != null) {
            try {
                locationManager.removeUpdates(this);
            } catch (Exception ignored) {}
            locationManager = null;
        }
        if (wakeLock != null && wakeLock.isHeld()) {
            try {
                wakeLock.release();
            } catch (Exception ignored) {}
            wakeLock = null;
        }
        stopForeground(true);
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
