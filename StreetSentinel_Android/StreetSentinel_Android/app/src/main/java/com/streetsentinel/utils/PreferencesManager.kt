package com.streetsentinel.utils

import android.content.Context
import android.content.SharedPreferences
import dagger.hilt.android.qualifiers.ApplicationContext
import timber.log.Timber
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Preferences Manager
 * Central store for all app preferences and session data
 */
@Singleton
class PreferencesManager @Inject constructor(
    @ApplicationContext private val context: Context
) {

    companion object {
        private const val TAG = "PreferencesManager"
        private const val PREFS_NAME = "streetsentinel_prefs"

        // Keys
        private const val KEY_USER_ID = "user_id"
        private const val KEY_USER_NAME = "user_name"
        private const val KEY_USER_EMAIL = "user_email"
        private const val KEY_USER_PHONE = "user_phone"
        private const val KEY_FCM_TOKEN = "fcm_token"

        private const val KEY_PROTECTION_ENABLED = "protection_enabled"
        private const val KEY_AUDIO_DETECTION_ENABLED = "audio_detection_enabled"
        private const val KEY_LOCATION_TRACKING_ENABLED = "location_tracking_enabled"
        private const val KEY_NIGHT_SAFETY_MODE_ENABLED = "night_safety_mode_enabled"
        private const val KEY_WHATSAPP_NOTIFICATION_ENABLED = "whatsapp_notification_enabled"
        private const val KEY_SHAKE_DETECTION_ENABLED = "shake_detection_enabled"
        private const val KEY_FAKE_CALL_ENABLED = "fake_call_enabled"

        private const val KEY_ACTIVE_ALERT_ID = "active_alert_id"
        private const val KEY_ALERT_STATUS = "alert_status"
        private const val KEY_ACTIVE_SAFEWALK_SESSION = "active_safewalk_session"

        private const val KEY_LAST_KNOWN_LATITUDE = "last_known_latitude"
        private const val KEY_LAST_KNOWN_LONGITUDE = "last_known_longitude"
        private const val KEY_LAST_LOCATION_TIMESTAMP = "last_location_timestamp"

        private const val KEY_AUDIO_SENSITIVITY = "audio_sensitivity"
        private const val KEY_AUTO_ESCALATE_TIME = "auto_escalate_time"

        private const val KEY_FIRST_LAUNCH = "first_launch"
        private const val KEY_ONBOARDING_DONE = "onboarding_done"
        private const val KEY_PERMISSIONS_GRANTED = "permissions_granted"

        @Volatile
        private var INSTANCE: PreferencesManager? = null

        fun getInstance(context: Context): PreferencesManager {
            return INSTANCE ?: synchronized(this) {
                INSTANCE ?: PreferencesManager(context).also { INSTANCE = it }
            }
        }
    }

    private val prefs: SharedPreferences =
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    // ==================== User Data ====================

    fun setUserId(id: String) = prefs.edit().putString(KEY_USER_ID, id).apply()
    fun getUserId(): String = prefs.getString(KEY_USER_ID, "") ?: ""

    fun setUserName(name: String) = prefs.edit().putString(KEY_USER_NAME, name).apply()
    fun getUserName(): String = prefs.getString(KEY_USER_NAME, "") ?: ""

    fun setUserEmail(email: String) = prefs.edit().putString(KEY_USER_EMAIL, email).apply()
    fun getUserEmail(): String = prefs.getString(KEY_USER_EMAIL, "") ?: ""

    fun setUserPhone(phone: String) = prefs.edit().putString(KEY_USER_PHONE, phone).apply()
    fun getUserPhone(): String = prefs.getString(KEY_USER_PHONE, "") ?: ""

    fun setFcmToken(token: String) = prefs.edit().putString(KEY_FCM_TOKEN, token).apply()
    fun getFcmToken(): String = prefs.getString(KEY_FCM_TOKEN, "") ?: ""

    // ==================== Feature Flags ====================

    fun setProtectionEnabled(enabled: Boolean) =
        prefs.edit().putBoolean(KEY_PROTECTION_ENABLED, enabled).apply()
    fun isProtectionEnabled(): Boolean = prefs.getBoolean(KEY_PROTECTION_ENABLED, true)

    fun setAudioDetectionEnabled(enabled: Boolean) =
        prefs.edit().putBoolean(KEY_AUDIO_DETECTION_ENABLED, enabled).apply()
    fun isAudioDetectionEnabled(): Boolean = prefs.getBoolean(KEY_AUDIO_DETECTION_ENABLED, true)

    fun setLocationTrackingEnabled(enabled: Boolean) =
        prefs.edit().putBoolean(KEY_LOCATION_TRACKING_ENABLED, enabled).apply()
    fun isLocationTrackingEnabled(): Boolean = prefs.getBoolean(KEY_LOCATION_TRACKING_ENABLED, true)

    fun setNightSafetyModeEnabled(enabled: Boolean) =
        prefs.edit().putBoolean(KEY_NIGHT_SAFETY_MODE_ENABLED, enabled).apply()
    fun isNightSafetyModeEnabled(): Boolean = prefs.getBoolean(KEY_NIGHT_SAFETY_MODE_ENABLED, true)

    fun setWhatsAppNotificationEnabled(enabled: Boolean) =
        prefs.edit().putBoolean(KEY_WHATSAPP_NOTIFICATION_ENABLED, enabled).apply()
    fun isWhatsAppNotificationEnabled(): Boolean =
        prefs.getBoolean(KEY_WHATSAPP_NOTIFICATION_ENABLED, true)

    fun setShakeDetectionEnabled(enabled: Boolean) =
        prefs.edit().putBoolean(KEY_SHAKE_DETECTION_ENABLED, enabled).apply()
    fun isShakeDetectionEnabled(): Boolean = prefs.getBoolean(KEY_SHAKE_DETECTION_ENABLED, true)

    fun setFakeCallEnabled(enabled: Boolean) =
        prefs.edit().putBoolean(KEY_FAKE_CALL_ENABLED, enabled).apply()
    fun isFakeCallEnabled(): Boolean = prefs.getBoolean(KEY_FAKE_CALL_ENABLED, true)

    // ==================== Alert Session ====================

    fun setActiveAlertId(alertId: String) =
        prefs.edit().putString(KEY_ACTIVE_ALERT_ID, alertId).apply()
    fun getActiveAlertId(): String = prefs.getString(KEY_ACTIVE_ALERT_ID, "") ?: ""
    fun clearActiveAlertId() = prefs.edit().remove(KEY_ACTIVE_ALERT_ID).apply()

    fun setAlertStatus(status: String) =
        prefs.edit().putString(KEY_ALERT_STATUS, status).apply()
    fun getAlertStatus(): String = prefs.getString(KEY_ALERT_STATUS, "") ?: ""

    fun setActiveSafeWalkSession(sessionJson: String) =
        prefs.edit().putString(KEY_ACTIVE_SAFEWALK_SESSION, sessionJson).apply()
    fun getActiveSafeWalkSession(): com.streetsentinel.data.models.SafeWalkSession? {
        val json = prefs.getString(KEY_ACTIVE_SAFEWALK_SESSION, null) ?: return null
        return try {
            com.google.gson.Gson().fromJson(json, com.streetsentinel.data.models.SafeWalkSession::class.java)
        } catch (e: Exception) {
            Timber.e(e, "$TAG: Error deserializing SafeWalk session")
            null
        }
    }
    fun clearActiveSafeWalkSession() = prefs.edit().remove(KEY_ACTIVE_SAFEWALK_SESSION).apply()

    // ==================== Location ====================

    fun setLastKnownLocation(latitude: Double, longitude: Double) {
        prefs.edit()
            .putLong(KEY_LAST_KNOWN_LATITUDE, java.lang.Double.doubleToRawLongBits(latitude))
            .putLong(KEY_LAST_KNOWN_LONGITUDE, java.lang.Double.doubleToRawLongBits(longitude))
            .putLong(KEY_LAST_LOCATION_TIMESTAMP, System.currentTimeMillis())
            .apply()
    }

    fun getLastKnownLocation(): Pair<Double, Double> {
        val lat = java.lang.Double.longBitsToDouble(
            prefs.getLong(KEY_LAST_KNOWN_LATITUDE, 0L)
        )
        val lng = java.lang.Double.longBitsToDouble(
            prefs.getLong(KEY_LAST_KNOWN_LONGITUDE, 0L)
        )
        return Pair(lat, lng)
    }

    fun getLastLocationTimestamp(): Long = prefs.getLong(KEY_LAST_LOCATION_TIMESTAMP, 0L)

    // ==================== Settings ====================

    fun setAudioSensitivity(sensitivity: Float) =
        prefs.edit().putFloat(KEY_AUDIO_SENSITIVITY, sensitivity).apply()
    fun getAudioSensitivity(): Float = prefs.getFloat(KEY_AUDIO_SENSITIVITY, 0.7f)

    fun setAutoEscalateTime(ms: Long) =
        prefs.edit().putLong(KEY_AUTO_ESCALATE_TIME, ms).apply()
    fun getAutoEscalateTime(): Long = prefs.getLong(KEY_AUTO_ESCALATE_TIME, 30000L)

    // ==================== Onboarding ====================

    fun setFirstLaunchDone() = prefs.edit().putBoolean(KEY_FIRST_LAUNCH, false).apply()
    fun isFirstLaunch(): Boolean = prefs.getBoolean(KEY_FIRST_LAUNCH, true)

    fun setOnboardingDone() = prefs.edit().putBoolean(KEY_ONBOARDING_DONE, true).apply()
    fun isOnboardingDone(): Boolean = prefs.getBoolean(KEY_ONBOARDING_DONE, false)

    fun setPermissionsGranted(granted: Boolean) =
        prefs.edit().putBoolean(KEY_PERMISSIONS_GRANTED, granted).apply()
    fun arePermissionsGranted(): Boolean = prefs.getBoolean(KEY_PERMISSIONS_GRANTED, false)

    // ==================== Clear ====================

    fun clearAll() {
        prefs.edit().clear().apply()
        Timber.d("$TAG: All preferences cleared")
    }

    fun clearUserData() {
        prefs.edit()
            .remove(KEY_USER_ID)
            .remove(KEY_USER_NAME)
            .remove(KEY_USER_EMAIL)
            .remove(KEY_USER_PHONE)
            .remove(KEY_FCM_TOKEN)
            .apply()
        Timber.d("$TAG: User data cleared")
    }
}
