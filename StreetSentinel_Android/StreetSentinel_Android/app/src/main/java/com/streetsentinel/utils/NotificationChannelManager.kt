package com.streetsentinel.utils

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.media.AudioAttributes
import android.net.Uri
import android.os.Build
import androidx.core.content.ContextCompat
import com.streetsentinel.R
import timber.log.Timber

/**
 * Notification Channel Manager
 * Centralizes all notification channel creation and management
 */
class NotificationChannelManager {

    companion object {
        private const val TAG = "NotificationChannelManager"

        // Channel IDs
        const val CHANNEL_EMERGENCY_ALERTS = "emergency_alerts"
        const val CHANNEL_PROTECTION_ACTIVE = "protection_active"
        const val CHANNEL_LOCATION_UPDATES = "location_updates"
        const val CHANNEL_AUDIO_ALERTS = "audio_alerts"
        const val CHANNEL_GENERAL_ALERTS = "general_alerts"

        fun createAllChannels(context: Context) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val notificationManager =
                    context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

                createEmergencyAlertsChannel(context, notificationManager)
                createProtectionActiveChannel(context, notificationManager)
                createLocationUpdatesChannel(context, notificationManager)
                createAudioAlertsChannel(context, notificationManager)
                createGeneralAlertsChannel(context, notificationManager)

                Timber.d("$TAG: All notification channels created")
            }
        }

        private fun createEmergencyAlertsChannel(
            context: Context,
            manager: NotificationManager
        ) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val channel = NotificationChannel(
                    CHANNEL_EMERGENCY_ALERTS,
                    "Emergency Alerts",
                    NotificationManager.IMPORTANCE_MAX
                ).apply {
                    description = "Critical safety emergency alerts"
                    enableVibration(true)
                    vibrationPattern = longArrayOf(0, 500, 200, 500, 200, 500)
                    enableLights(true)
                    lightColor = android.graphics.Color.RED
                    setShowBadge(true)
                    setBypassDnd(true)
                    lockscreenVisibility = android.app.Notification.VISIBILITY_PUBLIC

                    val audioAttributes = AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_ALARM)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .build()
                    setSound(
                        Uri.parse("android.resource://${context.packageName}/raw/emergency_alert"),
                        audioAttributes
                    )
                }
                manager.createNotificationChannel(channel)
            }
        }

        private fun createProtectionActiveChannel(
            context: Context,
            manager: NotificationManager
        ) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val channel = NotificationChannel(
                    CHANNEL_PROTECTION_ACTIVE,
                    "Protection Status",
                    NotificationManager.IMPORTANCE_LOW
                ).apply {
                    description = "StreetSentinel protection status"
                    enableVibration(false)
                    setShowBadge(false)
                    setSound(null, null)
                }
                manager.createNotificationChannel(channel)
            }
        }

        private fun createLocationUpdatesChannel(
            context: Context,
            manager: NotificationManager
        ) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val channel = NotificationChannel(
                    CHANNEL_LOCATION_UPDATES,
                    "Location Updates",
                    NotificationManager.IMPORTANCE_LOW
                ).apply {
                    description = "GPS location tracking updates"
                    enableVibration(false)
                    setShowBadge(false)
                    setSound(null, null)
                }
                manager.createNotificationChannel(channel)
            }
        }

        private fun createAudioAlertsChannel(
            context: Context,
            manager: NotificationManager
        ) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val channel = NotificationChannel(
                    CHANNEL_AUDIO_ALERTS,
                    "Audio Threat Alerts",
                    NotificationManager.IMPORTANCE_HIGH
                ).apply {
                    description = "Alerts for detected distress sounds"
                    enableVibration(true)
                    vibrationPattern = longArrayOf(0, 300, 200, 300)
                    enableLights(true)
                    lightColor = android.graphics.Color.YELLOW
                    setShowBadge(true)
                }
                manager.createNotificationChannel(channel)
            }
        }

        private fun createGeneralAlertsChannel(
            context: Context,
            manager: NotificationManager
        ) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val channel = NotificationChannel(
                    CHANNEL_GENERAL_ALERTS,
                    "General Alerts",
                    NotificationManager.IMPORTANCE_DEFAULT
                ).apply {
                    description = "General safety alerts and reminders"
                    enableVibration(true)
                    setShowBadge(true)
                }
                manager.createNotificationChannel(channel)
            }
        }
    }
}
