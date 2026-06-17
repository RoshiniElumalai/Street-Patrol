package com.streetsentinel.app;

import android.content.Intent;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "BackgroundProtection")
public class BackgroundProtectionPlugin extends Plugin {

    @PluginMethod
    public void startBackgroundService(PluginCall call) {
        try {
            Intent intent = new Intent(getContext(), BackgroundProtectionService.class);
            intent.setAction("START");
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                getContext().startForegroundService(intent);
            } else {
                getContext().startService(intent);
            }
            JSObject ret = new JSObject();
            ret.put("status", "started");
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to start service: " + e.getMessage());
        }
    }

    @PluginMethod
    public void stopBackgroundService(PluginCall call) {
        try {
            Intent intent = new Intent(getContext(), BackgroundProtectionService.class);
            intent.setAction("STOP");
            getContext().stopService(intent);
            JSObject ret = new JSObject();
            ret.put("status", "stopped");
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to stop service: " + e.getMessage());
        }
    }
}
