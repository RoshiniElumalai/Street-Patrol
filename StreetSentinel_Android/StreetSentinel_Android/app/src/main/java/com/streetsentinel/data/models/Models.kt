package com.streetsentinel.data.models

import android.os.Parcelable
import androidx.room.Entity
import androidx.room.PrimaryKey
import kotlinx.parcelize.Parcelize
import java.util.Date

// ==================== Enums ====================

enum class ThreatLevel {
    LOW, MEDIUM, HIGH, CRITICAL
}

enum class AlertStatus {
    PENDING_CONFIRMATION, ESCALATED, CANCELLED, COMPLETED
}

enum class SafeWalkStatus {
    ACTIVE, COMPLETED, CANCELLED, PAUSED
}

// ==================== User & Authentication ====================

@Parcelize
data class User(
    val userId: String = "",
    val name: String = "",
    val email: String = "",
    val phone: String = "",
    val profileImageUrl: String = "",
    val emergencyContactName: String = "",
    val emergencyContactPhone: String = "",
    val createdAt: Long = Date().time,
    val updatedAt: Long = Date().time,
    val isVerified: Boolean = false,
    val nightSafetyModeEnabled: Boolean = true,
    val audioDetectionEnabled: Boolean = true,
    val locationTrackingEnabled: Boolean = true
) : Parcelable

@Parcelize
data class Contact(
    val contactId: String = "",
    val userId: String = "",
    val name: String = "",
    val email: String = "",
    val phone: String = "",
    val relationship: String = "", // family, friend, colleague
    val isPrimary: Boolean = false,
    val isGuardian: Boolean = false,
    val canReceiveAlerts: Boolean = true,
    val canRequestLocation: Boolean = false,
    val addedAt: Long = Date().time
) : Parcelable

// ==================== Alerts ====================

@Entity(tableName = "alerts")
@Parcelize
data class Alert(
    @PrimaryKey
    val alertId: String = "",
    val userId: String = "",
    val threatType: String = "", // scream, help, distress, glass_breaking
    val threatLevel: ThreatLevel = ThreatLevel.LOW,
    val confidence: Float = 0f, // 0.0 to 1.0
    val decibels: Double = 0.0,
    val latitude: Double = 0.0,
    val longitude: Double = 0.0,
    val timestamp: Long = Date().time,
    val status: String = "PENDING_CONFIRMATION",
    val userConfirmedSafe: Boolean = false,
    val contactsNotified: Int = 0,
    val emailSent: Boolean = false,
    val whatsappSent: Boolean = false
) : Parcelable

data class AudioEvent(
    val eventId: String = "",
    val userId: String = "",
    val timestamp: Long = Date().time,
    val soundType: String = "", // scream, help, distress, etc
    val decibels: Double = 0.0,
    val confidence: Float = 0f,
    val threatLevel: ThreatLevel = ThreatLevel.LOW,
    val audioUrl: String = "", // Firebase Storage URL
    val saved: Boolean = false
)

// ==================== Location ====================

@Entity(tableName = "location_snapshots")
@Parcelize
data class LocationSnapshot(
    @PrimaryKey(autoGenerate = true)
    val id: Int = 0,
    val userId: String = "",
    val latitude: Double = 0.0,
    val longitude: Double = 0.0,
    val accuracy: Float = 0f,
    val altitude: Double = 0.0,
    val bearing: Float = 0f,
    val speed: Float = 0f,
    val timestamp: Long = Date().time,
    val provider: String = "gps",
    val syncedToFirebase: Boolean = false
) : Parcelable

@Entity(tableName = "safewalk_sessions")
@Parcelize
data class SafeWalkSession(
    @PrimaryKey
    val sessionId: String = "",
    val userId: String = "",
    val destinationName: String = "",
    val destinationLatitude: Double = 0.0,
    val destinationLongitude: Double = 0.0,
    val lastKnownLatitude: Double = 0.0,
    val lastKnownLongitude: Double = 0.0,
    val distance: Float = 0f, // in meters
    val eta: Long = 0L, // estimated time in milliseconds
    val startTime: Long = Date().time,
    val lastUpdateTime: Long = Date().time,
    val checkInTimeout: Long = 300000L, // 5 minutes default
    val checkInDone: Boolean = false,
    val status: String = "ACTIVE",
    val routeHistory: List<String> = emptyList(), // list of "lat,lng" pairs
    val guardians: List<String> = emptyList(), // guardian user IDs
    val shareRealTimeLocation: Boolean = true
) : Parcelable

// ==================== Check-in ====================

@Entity(tableName = "checkins")
@Parcelize
data class CheckIn(
    @PrimaryKey(autoGenerate = true)
    val id: Int = 0,
    val checkInId: String = "",
    val userId: String = "",
    val sessionId: String = "",
    val confirmedSafe: Boolean = false,
    val latitude: Double = 0.0,
    val longitude: Double = 0.0,
    val timestamp: Long = Date().time,
    val notes: String = ""
) : Parcelable

// ==================== Evidence ====================

@Entity(tableName = "evidence_vault")
@Parcelize
data class Evidence(
    @PrimaryKey(autoGenerate = true)
    val id: Int = 0,
    val evidenceId: String = "",
    val userId: String = "",
    val type: String = "", // audio, photo, video, location
    val alertId: String = "",
    val fileUrl: String = "",
    val fileName: String = "",
    val fileSize: Long = 0L,
    val timestamp: Long = Date().time,
    val description: String = "",
    val syncedToFirebase: Boolean = false
) : Parcelable

// ==================== System Health ====================

data class SystemHealth(
    val microphoneStatus: String = "CHECKING", // OK, ERROR, PERMISSION_DENIED
    val gpsStatus: String = "CHECKING",
    val internetStatus: String = "CHECKING",
    val notificationStatus: String = "CHECKING",
    val emailStatus: String = "CHECKING",
    val databaseStatus: String = "CHECKING",
    val protectionStatus: String = "ACTIVE",
    val lastAlertTime: Long = 0,
    val batteryPercentage: Int = 100,
    val storageAvailable: Long = 0,
    val lastSyncTime: Long = System.currentTimeMillis()
)

// ==================== Nearby Safety ====================

@Parcelize
data class SafetyPlace(
    val placeId: String = "",
    val name: String = "",
    val type: String = "", // hospital, police, womens_center, pharmacy
    val latitude: Double = 0.0,
    val longitude: Double = 0.0,
    val distance: Float = 0f, // in meters
    val address: String = "",
    val phone: String = "",
    val rating: Float = 0f,
    val openNow: Boolean = true
) : Parcelable

// ==================== Settings ====================

@Parcelize
data class AppSettings(
    val userId: String = "",
    val audioDetectionSensitivity: Float = 0.7f, // 0.0 to 1.0
    val locationUpdateInterval: Long = 30000L, // milliseconds
    val nightSafetyModeEnabled: Boolean = true,
    val nightSafetyStartTime: String = "20:00", // HH:mm
    val nightSafetyEndTime: String = "06:00",
    val audioDetectionEnabled: Boolean = true,
    val locationTrackingEnabled: Boolean = true,
    val emailNotificationsEnabled: Boolean = true,
    val whatsappNotificationsEnabled: Boolean = true,
    val smsNotificationsEnabled: Boolean = true,
    val pushNotificationsEnabled: Boolean = true,
    val darkModeEnabled: Boolean = false,
    val notificationSoundEnabled: Boolean = true,
    val vibrateOnAlert: Boolean = true,
    val autoEscalateTime: Long = 30000L, // milliseconds before auto-escalation
    val shareLocationWithGuardians: Boolean = true,
    val fakeCallEnabled: Boolean = true,
    val shakeDetectionEnabled: Boolean = true
) : Parcelable

// ==================== Statistics ====================

data class SafetyStatistics(
    val userId: String = "",
    val totalAlerts: Int = 0,
    val alertsThisWeek: Int = 0,
    val alertsThisMonth: Int = 0,
    val averageResponseTime: Long = 0, // milliseconds
    val totalSafeWalks: Int = 0,
    val totalCheckIns: Int = 0,
    val contactsAdded: Int = 0,
    val guardiansAdded: Int = 0,
    val lastAlertDate: Long = 0
)
