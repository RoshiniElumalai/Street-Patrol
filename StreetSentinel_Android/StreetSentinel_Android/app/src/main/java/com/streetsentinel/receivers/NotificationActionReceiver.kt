package com.streetsentinel.receivers

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.streetsentinel.managers.EmergencyAlertManager
import com.streetsentinel.services.NotificationService
import com.streetsentinel.utils.PreferencesManager
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch
import timber.log.Timber
import javax.inject.Inject

/**
 * Notification Action Receiver
 * 
 * Handles user actions from notifications:
 * - I'm Safe (cancel alert)
 * - Send Location (escalate)
 * - Cancel Alert
 */
@AndroidEntryPoint
class NotificationActionReceiver : BroadcastReceiver() {

    companion object {
        private const val TAG = "NotificationActionReceiver"
    }

    @Inject
    lateinit var emergencyAlertManager: EmergencyAlertManager

    @Inject
    lateinit var notificationService: NotificationService

    @Inject
    lateinit var preferencesManager: PreferencesManager

    private val scope = CoroutineScope(Dispatchers.Main + Job())

    override fun onReceive(context: Context?, intent: Intent?) {
        if (context == null || intent == null) {
            Timber.w("$TAG: Context or intent is null")
            return
        }

        Timber.d("$TAG: Action received: ${intent.action}")

        when (intent.action) {
            "com.streetsentinel.ACTION_SAFE" -> {
                handleUserSafe(context)
            }
            "com.streetsentinel.ACTION_SEND_LOCATION" -> {
                handleSendLocation(context)
            }
            "com.streetsentinel.ACTION_CANCEL_ALERT" -> {
                handleCancelAlert(context)
            }
            else -> {
                Timber.w("$TAG: Unknown action: ${intent.action}")
            }
        }
    }

    /**
     * Handle "I'm Safe" action
     */
    private fun handleUserSafe(context: Context) {
        try {
            Timber.d("$TAG: User confirmed safe")
            
            // Get active alert ID from preferences
            val activeAlertId = preferencesManager.getActiveAlertId()
            if (activeAlertId.isNotEmpty()) {
                emergencyAlertManager.confirmUserSafe(activeAlertId)
                preferencesManager.clearActiveAlertId()
                
                notificationService.showGeneralAlert(
                    title = "✓ Stay Safe",
                    message = "Alert cancelled. Keep being cautious."
                )
            }
        } catch (e: Exception) {
            Timber.e(e, "$TAG: Error handling user safe action")
        }
    }

    /**
     * Handle "Send Location" action
     */
    private fun handleSendLocation(context: Context) {
        try {
            Timber.d("$TAG: User clicked send location")
            
            scope.launch {
                try {
                    val activeAlertId = preferencesManager.getActiveAlertId()
                    if (activeAlertId.isNotEmpty()) {
                        val lastLocation = preferencesManager.getLastKnownLocation()
                        
                        emergencyAlertManager.escalateEmergency(
                            alertId = activeAlertId,
                            latitude = lastLocation.first,
                            longitude = lastLocation.second,
                            userPhone = preferencesManager.getUserPhone(),
                            userName = preferencesManager.getUserName()
                        )

                        preferencesManager.setAlertStatus("ESCALATED")
                        
                        notificationService.showGeneralAlert(
                            title = "📍 Location Sent",
                            message = "Emergency contacts have been notified with your location"
                        )
                    }
                } catch (e: Exception) {
                    Timber.e(e, "$TAG: Error sending location")
                }
            }
        } catch (e: Exception) {
            Timber.e(e, "$TAG: Error in handleSendLocation")
        }
    }

    /**
     * Handle "Cancel Alert" action
     */
    private fun handleCancelAlert(context: Context) {
        try {
            Timber.d("$TAG: User cancelled alert")
            
            val activeAlertId = preferencesManager.getActiveAlertId()
            if (activeAlertId.isNotEmpty()) {
                emergencyAlertManager.confirmUserSafe(activeAlertId)
                preferencesManager.clearActiveAlertId()
                
                notificationService.cancelNotification(2001) // Cancel emergency notification
                
                notificationService.showGeneralAlert(
                    title = "Alert Cancelled",
                    message = "Emergency alert has been cancelled"
                )
            }
        } catch (e: Exception) {
            Timber.e(e, "$TAG: Error handling cancel alert")
        }
    }
}
