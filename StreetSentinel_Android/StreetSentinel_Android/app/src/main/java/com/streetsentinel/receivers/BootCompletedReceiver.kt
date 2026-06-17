package com.streetsentinel.receivers

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.streetsentinel.services.StreetSentinelForegroundService
import com.streetsentinel.utils.PreferencesManager
import timber.log.Timber

/**
 * Boot Completed Receiver
 * 
 * Restarts StreetSentinel service after device reboot
 */
class BootCompletedReceiver : BroadcastReceiver() {

    companion object {
        private const val TAG = "BootCompletedReceiver"
    }

    override fun onReceive(context: Context?, intent: Intent?) {
        if (context == null) {
            Timber.w("$TAG: Context is null")
            return
        }

        if (intent?.action == Intent.ACTION_BOOT_COMPLETED ||
            intent?.action == "android.intent.action.QUICKBOOT_POWERON") {
            
            Timber.d("$TAG: Device boot completed - starting StreetSentinel")
            
            try {
                // Check if protection is enabled
                val prefs = PreferencesManager.getInstance(context)
                if (prefs.isProtectionEnabled()) {
                    StreetSentinelForegroundService.start(context)
                    Timber.d("$TAG: StreetSentinel service started after boot")
                }
            } catch (e: Exception) {
                Timber.e(e, "$TAG: Error starting service after boot")
            }
        }
    }
}
