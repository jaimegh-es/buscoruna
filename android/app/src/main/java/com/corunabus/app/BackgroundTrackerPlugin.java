package com.corunabus.app;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;

@CapacitorPlugin(
    name = "BackgroundTracker",
    permissions = {
        @Permission(
            alias = "location",
            strings = {
                Manifest.permission.ACCESS_FINE_LOCATION,
                Manifest.permission.ACCESS_COARSE_LOCATION
            }
        ),
        @Permission(
            alias = "notifications",
            strings = {
                Manifest.permission.POST_NOTIFICATIONS
            }
        )
    }
)
public class BackgroundTrackerPlugin extends Plugin {

    @PluginMethod
    public void startTracking(PluginCall call) {
        Context context = getContext();
        Intent intent = new Intent(context, BackgroundTrackerService.class);
        intent.setAction(BackgroundTrackerService.ACTION_START);

        intent.putExtra("busId", call.getString("busId", ""));
        intent.putExtra("lineId", call.getString("lineId", ""));
        intent.putExtra("originStopId", call.getInt("originStopId", 0));
        intent.putExtra("originStopName", call.getString("originStopName", ""));
        intent.putExtra("destinationStopId", call.getInt("destinationStopId", 0));
        intent.putExtra("destinationStopName", call.getString("destinationStopName", ""));
        intent.putExtra("destLat", call.getDouble("destLat", 0.0));
        intent.putExtra("destLon", call.getDouble("destLon", 0.0));
        intent.putExtra("prevLat", call.getDouble("prevLat", 0.0));
        intent.putExtra("prevLon", call.getDouble("prevLon", 0.0));
        intent.putExtra("leadMinutes", call.getInt("leadMinutes", 2));
        intent.putExtra("walkMinutes", call.getInt("walkMinutes", 0));
        intent.putExtra("locationName", call.getString("locationName", ""));
        intent.putExtra("etaAlertEnabled", call.getBoolean("etaAlertEnabled", true));
        intent.putExtra("gpsAlertEnabled", call.getBoolean("gpsAlertEnabled", true));
        intent.putExtra("lang", call.getString("lang", "es"));

        try {
            ContextCompat.startForegroundService(context, intent);
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to start BackgroundTrackerService", e);
        }
    }

    @PluginMethod
    public void stopTracking(PluginCall call) {
        Context context = getContext();
        Intent intent = new Intent(context, BackgroundTrackerService.class);
        intent.setAction(BackgroundTrackerService.ACTION_STOP);
        try {
            context.stopService(intent);
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to stop BackgroundTrackerService", e);
        }
    }

    @PluginMethod
    public void isTracking(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("isTracking", BackgroundTrackerService.isRunning);
        call.resolve(ret);
    }
}
