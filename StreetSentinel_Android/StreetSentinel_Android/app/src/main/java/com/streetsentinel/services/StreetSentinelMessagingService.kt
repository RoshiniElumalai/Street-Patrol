package com.streetsentinel.services

import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import com.streetsentinel.R
import com.streetsentinel.receivers.NotificationActionReceiver
import com.streetsentinel.ui.MainActivity
import com.streetsentinel.utils.NotificationChannelManager
import dagger.hilt.android.AndroidEntryPoint
import timber.log.Timber
import javax.inject.Inject

/**
 * Firebase Cloud Messaging Service
 * 
 * Handles push notifications from Firebase including:
 * - Emergency alerts
 * - Guardian notifications
 * - System alerts
 * - Check-in reminders
 */
@AndroidEntryPoint
class StreetSentinelMessagingService : FirebaseMessagingService() {

    companion object {
        private const val TAG = "FCMMessagingService"
    }

    @Inject
    lateinit var notificationService: NotificationService

    override fun onNewToken(token: String) {
        super.onNewToken(token)
        Timber.d("$TAG: New FCM token: $token")
        
        // Update token on server/Firebase
        saveFCMTokenToDatabase(token)
    }

    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        Timber.d("$TAG: FCM message received from: ${remoteMessage.from}")

        // Check if message contains data payload
        if (remoteMessage.data.isNotEmpty()) {
            Timber.d("$TAG: Message data: ${remoteMessage.data}")
            handleDataMessage(remoteMessage.data)
        }

        // Check if message contains notification payload
        remoteMessage.notification?.let {
            Timber.d("$TAG: Message notification - Title: ${it.title}, Body: ${it.body}")
            handleNotificationMessage(
                it.title ?: "StreetSentinel Alert",
                it.body ?: "You have a new alert",
                remoteMessage.data
            )
        }
    }

    /**
     * Handle data message from Firebase
     */
    private fun handleDataMessage(data: Map<String, String>) {
        try {
            val messageType = data["messageType"] ?: return
            
            when (messageType) {
                "emergency_alert" -> {
                    handleEmergencyAlert(data)
                }
                "location_request" -> {
                    handleLocationRequest(data)
                }
                "checkin_reminder" -> {
                    handleCheckInReminder(data)
                }
                "guardian_notification" -> {
                    handleGuardianNotification(data)
                }
                "system_alert" -> {
                    handleSystemAlert(data)
                }
                else -> {
                    Timber.w("$TAG: Unknown message type: $messageType")
                }
            }
        } catch (e: Exception) {
            Timber.e(e, "$TAG: Error handling data message")
        }
    }

    /**
     * Handle notification message
     */
    private fun handleNotificationMessage(
        title: String,
        body: String,
        data: Map<String, String>
    ) {
        try {
            val messageType = data["messageType"] ?: "general"
            
            when {
                messageType.contains("emergency", ignoreCase = true) -> {
                    notificationService.showEmergencyAlert(
                        title = title,
                        message = body,
                        latitude = data["latitude"]?.toDoubleOrNull() ?: 0.0,
                        longitude = data["longitude"]?.toDoubleOrNull() ?: 0.0,
                        threatType = data["threatType"] ?: "Unknown"
                    )
                }
                messageType.contains("location", ignoreCase = true) -> {
                    notificationService.showGeneralAlert(
                        title = title,
                        message = body,
                        priority = NotificationCompat.PRIORITY_HIGH
                    )
                }
                else -> {
                    notificationService.showGeneralAlert(
                        title = title,
                        message = body
                    )
                }
            }
        } catch (e: Exception) {
            Timber.e(e, "$TAG: Error handling notification message")
        }
    }

    /**
     * Handle emergency alert from Firebase
     */
    private fun handleEmergencyAlert(data: Map<String, String>) {
        try {
            Timber.d("$TAG: Handling emergency alert")
            
            val latitude = data["latitude"]?.toDoubleOrNull() ?: 0.0
            val longitude = data["longitude"]?.toDoubleOrNull() ?: 0.0
            val threatType = data["threatType"] ?: "Unknown Threat"
            val message = data["message"] ?: "Emergency alert received"

            notificationService.showEmergencyAlert(
                title = "🚨 Emergency Alert",
                message = message,
                latitude = latitude,
                longitude = longitude,
                threatType = threatType
            )
        } catch (e: Exception) {
            Timber.e(e, "$TAG: Error handling emergency alert")
        }
    }

    /**
     * Handle location request from guardians
     */
    private fun handleLocationRequest(data: Map<String, String>) {
        try {
            Timber.d("$TAG: Handling location request")
            
            val requesterId = data["requesterId"] ?: "Unknown"
            val requesterName = data["requesterName"] ?: "A guardian"

            notificationService.showGeneralAlert(
                title = "📍 Location Requested",
                message = "$requesterName is requesting your location",
                priority = NotificationCompat.PRIORITY_HIGH
            )
        } catch (e: Exception) {
            Timber.e(e, "$TAG: Error handling location request")
        }
    }

    /**
     * Handle check-in reminder
     */
    private fun handleCheckInReminder(data: Map<String, String>) {
        try {
            Timber.d("$TAG: Handling check-in reminder")
            
            val sessionId = data["sessionId"] ?: return
            val destination = data["destination"] ?: "your destination"

            notificationService.showCheckInReminder(
                sessionId = sessionId,
                destination = destination
            )
        } catch (e: Exception) {
            Timber.e(e, "$TAG: Error handling check-in reminder")
        }
    }

    /**
     * Handle guardian notification
     */
    private fun handleGuardianNotification(data: Map<String, String>) {
        try {
            Timber.d("$TAG: Handling guardian notification")
            
            val guardianName = data["guardianName"] ?: "Your guardian"
            val message = data["message"] ?: "Guardian notification"

            notificationService.showGeneralAlert(
                title = "👥 Guardian Message",
                message = message,
                priority = NotificationCompat.PRIORITY_DEFAULT
            )
        } catch (e: Exception) {
            Timber.e(e, "$TAG: Error handling guardian notification")
        }
    }

    /**
     * Handle system alert
     */
    private fun handleSystemAlert(data: Map<String, String>) {
        try {
            Timber.d("$TAG: Handling system alert")
            
            val alertLevel = data["level"] ?: "info"
            val title = data["title"] ?: "System Alert"
            val message = data["message"] ?: "Important system notification"

            val priority = when (alertLevel.lowercase()) {
                "critical" -> NotificationCompat.PRIORITY_MAX
                "high" -> NotificationCompat.PRIORITY_HIGH
                "medium" -> NotificationCompat.PRIORITY_DEFAULT
                else -> NotificationCompat.PRIORITY_LOW
            }

            notificationService.showGeneralAlert(
                title = title,
                message = message,
                priority = priority
            )
        } catch (e: Exception) {
            Timber.e(e, "$TAG: Error handling system alert")
        }
    }

    /**
     * Save FCM token to Firebase Database
     */
    private fun saveFCMTokenToDatabase(token: String) {
        try {
            val currentUser = com.google.firebase.auth.FirebaseAuth.getInstance().currentUser
            if (currentUser != null) {
                val database = com.google.firebase.database.FirebaseDatabase.getInstance()
                val userRef = database.getReference("users").child(currentUser.uid)
                
                userRef.child("fcmToken").setValue(token).addOnFailureListener { e ->
                    Timber.e(e, "$TAG: Failed to save FCM token")
                }
                
                Timber.d("$TAG: FCM token saved for user: ${currentUser.uid}")
            }
        } catch (e: Exception) {
            Timber.e(e, "$TAG: Error saving FCM token")
        }
    }
}
