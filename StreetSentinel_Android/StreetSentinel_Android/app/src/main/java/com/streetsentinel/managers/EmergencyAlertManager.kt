package com.streetsentinel.managers

import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.core.content.ContextCompat
import com.google.firebase.firestore.FirebaseFirestore
import com.streetsentinel.data.models.Alert
import com.streetsentinel.data.models.Contact
import com.streetsentinel.data.models.ThreatLevel
import com.streetsentinel.data.repository.AlertRepository
import com.streetsentinel.data.repository.ContactRepository
import com.streetsentinel.services.LocationTrackingService
import com.streetsentinel.services.NotificationService
import com.streetsentinel.utils.PreferencesManager
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch
import timber.log.Timber
import java.util.Date
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Emergency Alert Manager
 * 
 * Handles the complete emergency workflow:
 * 1. Threat detection
 * 2. User confirmation
 * 3. Location sharing
 * 4. Contact notification
 * 5. Email escalation
 * 6. WhatsApp escalation
 */
@Singleton
class EmergencyAlertManager @Inject constructor(
    @ApplicationContext private val context: Context,
    private val notificationService: NotificationService,
    private val alertRepository: AlertRepository,
    private val contactRepository: ContactRepository,
    private val preferencesManager: PreferencesManager
) {

    companion object {
        private const val TAG = "EmergencyAlertManager"
        private const val GOOGLE_MAPS_API_URL = "https://www.google.com/maps"
        private const val EMERGENCY_ALERT_TIMEOUT = 30000L // 30 seconds
    }

    private val scope = CoroutineScope(Dispatchers.IO + Job())

    /**
     * Trigger emergency alert workflow
     */
    fun triggerEmergencyAlert(
        threatType: String,
        confidence: Float,
        decibels: Double,
        latitude: Double = 0.0,
        longitude: Double = 0.0
    ) {
        Timber.d("$TAG: Emergency alert triggered - Type: $threatType, Confidence: $confidence")
        
        scope.launch {
            try {
                // Get current location
                val locationData = getCurrentLocation()
                val finalLatitude = if (latitude != 0.0) latitude else locationData?.first ?: 0.0
                val finalLongitude = if (longitude != 0.0) longitude else locationData?.second ?: 0.0

                // Create alert record
                val alert = Alert(
                    alertId = generateAlertId(),
                    userId = preferencesManager.getUserId(),
                    threatType = threatType,
                    threatLevel = determineThreatLevel(confidence, decibels),
                    confidence = confidence,
                    decibels = decibels,
                    latitude = finalLatitude,
                    longitude = finalLongitude,
                    timestamp = Date().time,
                    status = "PENDING_CONFIRMATION"
                )

                // Save alert
                alertRepository.saveAlert(alert)
                Timber.d("$TAG: Alert saved to database")

                // Show notification
                notificationService.showEmergencyAlert(
                    title = "🚨 Possible Emergency Detected",
                    message = "StreetSentinel detected distress audio nearby. Are you safe?",
                    latitude = finalLatitude,
                    longitude = finalLongitude,
                    threatType = threatType
                )

                // Set up timeout for auto-escalation
                setupAlertTimeout(alert)

            } catch (e: Exception) {
                Timber.e(e, "$TAG: Error triggering emergency alert")
            }
        }
    }

    /**
     * Confirm user is safe - cancel alert
     */
    fun confirmUserSafe(alertId: String) {
        Timber.d("$TAG: User confirmed safe for alert: $alertId")
        
        scope.launch {
            try {
                alertRepository.updateAlertStatus(alertId, "CANCELLED")
                notificationService.cancelNotification(2001) // Cancel emergency notification
            } catch (e: Exception) {
                Timber.e(e, "$TAG: Error confirming user safe")
            }
        }
    }

    /**
     * Escalate emergency - send to contacts
     */
    fun escalateEmergency(
        alertId: String,
        latitude: Double,
        longitude: Double,
        userPhone: String,
        userName: String
    ) {
        Timber.d("$TAG: Escalating emergency - Alert: $alertId")
        
        scope.launch {
            try {
                // Update alert status
                alertRepository.updateAlertStatus(alertId, "ESCALATED")

                // Get contacts to notify
                val contacts = contactRepository.getEmergencyContacts()

                if (contacts.isEmpty()) {
                    Timber.w("$TAG: No emergency contacts found")
                    return@launch
                }

                // Generate Google Maps link
                val mapsLink = generateMapsLink(latitude, longitude)

                // Send alerts to contacts
                for (contact in contacts) {
                    sendAlertToContact(
                        contact = contact,
                        alertId = alertId,
                        latitude = latitude,
                        longitude = longitude,
                        mapsLink = mapsLink,
                        userName = userName,
                        userPhone = userPhone
                    )
                }

                Timber.d("$TAG: Emergency escalated to ${contacts.size} contacts")

            } catch (e: Exception) {
                Timber.e(e, "$TAG: Error escalating emergency")
            }
        }
    }

    /**
     * Send alert to individual contact
     */
    private suspend fun sendAlertToContact(
        contact: Contact,
        alertId: String,
        latitude: Double,
        longitude: Double,
        mapsLink: String,
        userName: String,
        userPhone: String
    ) {
        try {
            // Send SMS
            if (contact.phone.isNotEmpty()) {
                sendEmergencySMS(
                    phoneNumber = contact.phone,
                    message = "EMERGENCY: $userName may need help. Location: $mapsLink. Call: $userPhone"
                )
            }

            // Send Email
            if (contact.email.isNotEmpty()) {
                sendEmergencyEmail(
                    email = contact.email,
                    name = contact.name,
                    userName = userName,
                    userPhone = userPhone,
                    mapsLink = mapsLink,
                    latitude = latitude,
                    longitude = longitude
                )
            }

            // Send WhatsApp
            if (contact.phone.isNotEmpty() && preferencesManager.isWhatsAppNotificationEnabled()) {
                sendWhatsAppNotification(
                    phoneNumber = contact.phone,
                    message = "🚨 EMERGENCY: $userName may need help.\nLocation: $mapsLink\nCall: $userPhone"
                )
            }

            // Update alert delivery status
            alertRepository.addContactNotification(
                alertId = alertId,
                contactId = contact.contactId,
                method = "sms_email_whatsapp",
                timestamp = System.currentTimeMillis()
            )

        } catch (e: Exception) {
            Timber.e(e, "$TAG: Error sending alert to contact: ${contact.name}")
        }
    }

    /**
     * Send emergency SMS
     */
    private fun sendEmergencySMS(phoneNumber: String, message: String) {
        try {
            val uri = Uri.parse("smsto:$phoneNumber")
            val intent = Intent(Intent.ACTION_SENDTO, uri).apply {
                putExtra("sms_body", message)
            }
            ContextCompat.startActivity(context, intent, null)
            Timber.d("$TAG: SMS sent to $phoneNumber")
        } catch (e: Exception) {
            Timber.e(e, "$TAG: Error sending SMS")
        }
    }

    /**
     * Send emergency email via Firebase
     */
    private suspend fun sendEmergencyEmail(
        email: String,
        name: String,
        userName: String,
        userPhone: String,
        mapsLink: String,
        latitude: Double,
        longitude: Double
    ) {
        try {
            val emailData = mapOf(
                "to" to email,
                "subject" to "🚨 EMERGENCY: $userName May Need Help",
                "message" to """
                    EMERGENCY ALERT
                    
                    User: $userName
                    Phone: $userPhone
                    Time: ${Date()}
                    
                    Location: $mapsLink
                    Coordinates: $latitude, $longitude
                    
                    Please contact immediately or inform local authorities.
                """.trimIndent()
            )

            val db = FirebaseFirestore.getInstance()
            db.collection("emails").add(emailData)
                .addOnSuccessListener {
                    Timber.d("$TAG: Email sent to $email")
                }
                .addOnFailureListener { e ->
                    Timber.e(e, "$TAG: Failed to send email to $email")
                }

        } catch (e: Exception) {
            Timber.e(e, "$TAG: Error sending emergency email")
        }
    }

    /**
     * Send WhatsApp notification
     */
    private fun sendWhatsAppNotification(phoneNumber: String, message: String) {
        try {
            val intent = Intent(Intent.ACTION_SEND).apply {
                type = "text/plain"
                putExtra("jid", phoneNumber + "@s.whatsapp.net")
                putExtra(Intent.EXTRA_TEXT, message)
                setPackage("com.whatsapp")
            }
            ContextCompat.startActivity(context, intent, null)
            Timber.d("$TAG: WhatsApp notification sent to $phoneNumber")
        } catch (e: Exception) {
            Timber.e(e, "$TAG: WhatsApp not installed or error sending")
        }
    }

    /**
     * Setup timeout for auto-escalation
     */
    private fun setupAlertTimeout(alert: Alert) {
        scope.launch {
            try {
                kotlinx.coroutines.delay(EMERGENCY_ALERT_TIMEOUT)
                
                // Check if alert is still pending
                val currentAlert = alertRepository.getAlertById(alert.alertId)
                if (currentAlert?.status == "PENDING_CONFIRMATION") {
                    Timber.w("$TAG: Alert timeout - auto-escalating")
                    
                    // Auto-escalate
                    escalateEmergency(
                        alertId = alert.alertId,
                        latitude = alert.latitude,
                        longitude = alert.longitude,
                        userPhone = preferencesManager.getUserPhone(),
                        userName = preferencesManager.getUserName()
                    )
                }
            } catch (e: Exception) {
                Timber.e(e, "$TAG: Error in alert timeout")
            }
        }
    }

    /**
     * Get current location
     */
    private suspend fun getCurrentLocation(): Pair<Double, Double>? {
        return try {
            val location = preferencesManager.getLastKnownLocation()
            Pair(location.first, location.second)
        } catch (e: Exception) {
            Timber.e(e, "$TAG: Error getting current location")
            null
        }
    }

    /**
     * Generate Google Maps link
     */
    private fun generateMapsLink(latitude: Double, longitude: Double): String {
        return "$GOOGLE_MAPS_API_URL?q=$latitude,$longitude"
    }

    /**
     * Determine threat level
     */
    private fun determineThreatLevel(confidence: Float, decibels: Double): ThreatLevel {
        return when {
            confidence >= 0.9f && decibels >= 95.0 -> ThreatLevel.CRITICAL
            confidence >= 0.8f && decibels >= 90.0 -> ThreatLevel.HIGH
            confidence >= 0.7f && decibels >= 85.0 -> ThreatLevel.MEDIUM
            else -> ThreatLevel.LOW
        }
    }

    /**
     * Generate unique alert ID
     */
    private fun generateAlertId(): String {
        return "alert_${System.currentTimeMillis()}_${(0..999).random()}"
    }
}
