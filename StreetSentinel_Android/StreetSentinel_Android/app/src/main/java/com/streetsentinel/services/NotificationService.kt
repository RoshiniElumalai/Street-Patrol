package com.streetsentinel.services

import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.media.RingtoneManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import com.streetsentinel.R
import com.streetsentinel.receivers.NotificationActionReceiver
import com.streetsentinel.ui.emergency.EmergencyAlertActivity
import com.streetsentinel.utils.NotificationChannelManager
import dagger.hilt.android.qualifiers.ApplicationContext
import timber.log.Timber
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Notification Service
 * 
 * Handles all notifications including:
 * - Emergency alerts (lock screen)
 * - Location updates
 * - Audio detections
 * - Check-in reminders
 * - General alerts
 */
@Singleton
class NotificationService @Inject constructor(
    @ApplicationContext private val context: Context
) {

    companion object {
        private const val TAG = "NotificationService"
        private const val EMERGENCY_ALERT_ID = 2001
        private const val LOCATION_UPDATE_ID = 2002
        private const val AUDIO_ALERT_ID = 2003
        private const val CHECKIN_REMINDER_ID = 2004
        private const val GENERAL_ALERT_ID = 2005
    }

    private val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

    /**
     * Show emergency alert notification
     */
    fun showEmergencyAlert(
        title: String,
        message: String,
        latitude: Double,
        longitude: Double,
        threatType: String
    ) {
        try {
            Timber.d("$TAG: Showing emergency alert - $title")

            // Create intent for emergency activity
            val intent = Intent(context, EmergencyAlertActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                putExtra("title", title)
                putExtra("message", message)
                putExtra("latitude", latitude)
                putExtra("longitude", longitude)
                putExtra("threatType", threatType)
            }
            val emergencyPendingIntent = android.app.PendingIntent.getActivity(
                context,
                0,
                intent,
                android.app.PendingIntent.FLAG_IMMUTABLE or android.app.PendingIntent.FLAG_UPDATE_CURRENT
            )

            // Create action intents
            val iAmSafeIntent = Intent(context, NotificationActionReceiver::class.java).apply {
                action = "com.streetsentinel.ACTION_SAFE"
                putExtra("notificationId", EMERGENCY_ALERT_ID)
            }
            val iAmSafePendingIntent = android.app.PendingIntent.getBroadcast(
                context,
                1,
                iAmSafeIntent,
                android.app.PendingIntent.FLAG_IMMUTABLE or android.app.PendingIntent.FLAG_UPDATE_CURRENT
            )

            val sendLocationIntent = Intent(context, NotificationActionReceiver::class.java).apply {
                action = "com.streetsentinel.ACTION_SEND_LOCATION"
                putExtra("notificationId", EMERGENCY_ALERT_ID)
            }
            val sendLocationPendingIntent = android.app.PendingIntent.getBroadcast(
                context,
                2,
                sendLocationIntent,
                android.app.PendingIntent.FLAG_IMMUTABLE or android.app.PendingIntent.FLAG_UPDATE_CURRENT
            )

            // Build notification
            val notification = NotificationCompat.Builder(
                context,
                NotificationChannelManager.CHANNEL_EMERGENCY_ALERTS
            )
                .setContentTitle(title)
                .setContentText(message)
                .setSmallIcon(android.R.drawable.ic_dialog_alert)
                .setColor(ContextCompat.getColor(context, android.R.color.holo_red_dark))
                .setAutoCancel(true)
                .setCategory(NotificationCompat.CATEGORY_ALARM)
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setVibrate(longArrayOf(0, 500, 200, 500))
                .setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM))
                .setLights(0xFFFF0000.toInt(), 1000, 1000)
                .setContentIntent(emergencyPendingIntent)
                .addAction(
                    android.R.drawable.ic_menu_save,
                    context.getString(R.string.action_i_am_safe),
                    iAmSafePendingIntent
                )
                .addAction(
                    android.R.drawable.ic_menu_mylocation,
                    context.getString(R.string.action_send_location),
                    sendLocationPendingIntent
                )
                .setFullScreenIntent(emergencyPendingIntent, true)
                .setShowWhen(true)
                .build()

            notificationManager.notify(EMERGENCY_ALERT_ID, notification)

            Timber.d("$TAG: Emergency alert notification displayed")
        } catch (e: Exception) {
            Timber.e(e, "$TAG: Error showing emergency alert")
        }
    }

    /**
     * Show audio threat detection notification
     */
    fun showAudioThreatAlert(
        soundType: String,
        confidence: Float,
        latitude: Double,
        longitude: Double
    ) {
        try {
            Timber.d("$TAG: Showing audio threat alert - $soundType")

            val intent = Intent(context, EmergencyAlertActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                putExtra("title", "⚠ Possible Emergency Detected")
                putExtra("message", "StreetSentinel detected distress audio nearby. Are you safe?")
                putExtra("threatType", soundType)
                putExtra("latitude", latitude)
                putExtra("longitude", longitude)
                putExtra("confidence", confidence)
            }
            val pendingIntent = android.app.PendingIntent.getActivity(
                context,
                0,
                intent,
                android.app.PendingIntent.FLAG_IMMUTABLE or android.app.PendingIntent.FLAG_UPDATE_CURRENT
            )

            val notification = NotificationCompat.Builder(
                context,
                NotificationChannelManager.CHANNEL_AUDIO_ALERTS
            )
                .setContentTitle("⚠ Possible Emergency Detected")
                .setContentText("Distress audio: $soundType (${(confidence * 100).toInt()}% confidence)")
                .setSmallIcon(android.R.drawable.ic_dialog_alert)
                .setColor(ContextCompat.getColor(context, android.R.color.holo_orange_dark))
                .setAutoCancel(true)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setVibrate(longArrayOf(0, 300, 200, 300))
                .setContentIntent(pendingIntent)
                .setFullScreenIntent(pendingIntent, true)
                .build()

            notificationManager.notify(AUDIO_ALERT_ID, notification)

            Timber.d("$TAG: Audio threat alert notification displayed")
        } catch (e: Exception) {
            Timber.e(e, "$TAG: Error showing audio threat alert")
        }
    }

    /**
     * Show location update notification
     */
    fun showLocationUpdateNotification(
        latitude: Double,
        longitude: Double,
        accuracy: Float
    ) {
        try {
            val notification = NotificationCompat.Builder(
                context,
                NotificationChannelManager.CHANNEL_LOCATION_UPDATES
            )
                .setContentTitle("📍 Location Updated")
                .setContentText("Lat: %.4f, Lng: %.4f (±${accuracy.toInt()}m)".format(latitude, longitude))
                .setSmallIcon(android.R.drawable.ic_menu_mylocation)
                .setColor(ContextCompat.getColor(context, R.color.primary))
                .setAutoCancel(true)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .build()

            notificationManager.notify(LOCATION_UPDATE_ID, notification)

        } catch (e: Exception) {
            Timber.e(e, "$TAG: Error showing location update notification")
        }
    }

    /**
     * Show check-in reminder
     */
    fun showCheckInReminder(sessionId: String, destination: String) {
        try {
            Timber.d("$TAG: Showing check-in reminder")

            val intent = Intent(context, com.streetsentinel.ui.MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
                putExtra("openCheckin", true)
                putExtra("sessionId", sessionId)
            }
            val pendingIntent = android.app.PendingIntent.getActivity(
                context,
                0,
                intent,
                android.app.PendingIntent.FLAG_IMMUTABLE or android.app.PendingIntent.FLAG_UPDATE_CURRENT
            )

            val notification = NotificationCompat.Builder(
                context,
                NotificationChannelManager.CHANNEL_GENERAL_ALERTS
            )
                .setContentTitle("✓ Have you arrived safely?")
                .setContentText("Check-in: $destination")
                .setSmallIcon(android.R.drawable.ic_menu_save)
                .setColor(ContextCompat.getColor(context, R.color.primary))
                .setAutoCancel(true)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setVibrate(longArrayOf(0, 300, 200, 300))
                .setContentIntent(pendingIntent)
                .build()

            notificationManager.notify(CHECKIN_REMINDER_ID, notification)

            Timber.d("$TAG: Check-in reminder displayed")
        } catch (e: Exception) {
            Timber.e(e, "$TAG: Error showing check-in reminder")
        }
    }

    /**
     * Show general alert
     */
    fun showGeneralAlert(
        title: String,
        message: String,
        priority: Int = NotificationCompat.PRIORITY_DEFAULT
    ) {
        try {
            Timber.d("$TAG: Showing general alert - $title")

            val notification = NotificationCompat.Builder(
                context,
                NotificationChannelManager.CHANNEL_GENERAL_ALERTS
            )
                .setContentTitle(title)
                .setContentText(message)
                .setSmallIcon(android.R.drawable.ic_dialog_info)
                .setColor(ContextCompat.getColor(context, R.color.primary))
                .setAutoCancel(true)
                .setPriority(priority)
                .build()

            notificationManager.notify(GENERAL_ALERT_ID, notification)

            Timber.d("$TAG: General alert displayed")
        } catch (e: Exception) {
            Timber.e(e, "$TAG: Error showing general alert")
        }
    }

    /**
     * Cancel notification
     */
    fun cancelNotification(notificationId: Int) {
        try {
            notificationManager.cancel(notificationId)
            Timber.d("$TAG: Notification $notificationId cancelled")
        } catch (e: Exception) {
            Timber.e(e, "$TAG: Error cancelling notification")
        }
    }

    /**
     * Cancel all notifications
     */
    fun cancelAllNotifications() {
        try {
            notificationManager.cancelAll()
            Timber.d("$TAG: All notifications cancelled")
        } catch (e: Exception) {
            Timber.e(e, "$TAG: Error cancelling all notifications")
        }
    }
}
