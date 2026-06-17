package com.streetsentinel.receivers

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.location.LocationManager
import com.streetsentinel.services.LocationTrackingService
import timber.log.Timber

/**
 * Location Update Receiver
 * Handles location provider changes
 */
class LocationUpdateReceiver : BroadcastReceiver() {
    companion object {
        private const val TAG = "LocationUpdateReceiver"
    }

    override fun onReceive(context: Context?, intent: Intent?) {
        if (context == null || intent == null) return

        when (intent.action) {
            LocationManager.PROVIDERS_CHANGED_ACTION -> {
                Timber.d("$TAG: Location providers changed")
                LocationTrackingService.start(context)
            }
        }
    }
}

/**
 * Lock Screen Receiver
 * Ensures protection continues when screen is locked
 */
class LockScreenReceiver : BroadcastReceiver() {
    companion object {
        private const val TAG = "LockScreenReceiver"
    }

    override fun onReceive(context: Context?, intent: Intent?) {
        if (context == null || intent == null) return

        when (intent.action) {
            Intent.ACTION_SCREEN_OFF -> {
                Timber.d("$TAG: Screen off - protection continues")
            }
            Intent.ACTION_SCREEN_ON -> {
                Timber.d("$TAG: Screen on")
            }
            Intent.ACTION_USER_PRESENT -> {
                Timber.d("$TAG: User unlocked device")
            }
        }
    }
}

/**
 * Call Receiver
 * Handles incoming calls to prevent audio detection false positives
 */
class CallReceiver : BroadcastReceiver() {
    companion object {
        private const val TAG = "CallReceiver"
    }

    override fun onReceive(context: Context?, intent: Intent?) {
        if (context == null || intent == null) return

        when (intent.action) {
            Intent.ACTION_NEW_OUTGOING_CALL -> {
                val phoneNumber = intent.getStringExtra(Intent.EXTRA_PHONE_NUMBER)
                Timber.d("$TAG: Outgoing call to $phoneNumber")
            }
            "android.intent.action.PHONE_STATE" -> {
                val state = intent.getStringExtra("state")
                Timber.d("$TAG: Phone state changed to $state")
            }
        }
    }
}
