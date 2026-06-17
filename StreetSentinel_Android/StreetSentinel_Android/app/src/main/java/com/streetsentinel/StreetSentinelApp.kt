package com.streetsentinel

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Build
import android.util.Log
import com.google.firebase.FirebaseApp
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.streetsentinel.data.local.AppDatabase
import com.streetsentinel.services.StreetSentinelForegroundService
import com.streetsentinel.utils.NotificationChannelManager
import com.streetsentinel.utils.PreferencesManager
import dagger.hilt.android.HiltAndroidApp
import timber.log.Timber

/**
 * Main application class for StreetSentinel
 * Handles initialization of Firebase, Timber, and notification channels
 */
@HiltAndroidApp
class StreetSentinelApp : Application() {

    companion object {
        private const val TAG = "StreetSentinelApp"
        private lateinit var instance: StreetSentinelApp

        fun getInstance(): StreetSentinelApp {
            return instance
        }
    }

    override fun onCreate() {
        super.onCreate()
        instance = this

        // Initialize Timber for logging
        if (BuildConfig.DEBUG) {
            Timber.plant(Timber.DebugTree())
        } else {
            Timber.plant(CrashlyticsTree())
        }

        Timber.d("$TAG: Application onCreate()")

        try {
            // Initialize Firebase
            initializeFirebase()

            // Create notification channels
            createNotificationChannels()

            // Initialize database
            initializeDatabase()

            // Initialize preferences
            initializePreferences()

            // Start foreground service
            startProtectionService()

            Timber.d("$TAG: Application initialization completed successfully")
        } catch (e: Exception) {
            Timber.e(e, "$TAG: Error during application initialization")
        }
    }

    /**
     * Initialize Firebase Authentication and Firestore
     */
    private fun initializeFirebase() {
        try {
            Timber.d("$TAG: Initializing Firebase")
            
            // Firebase is initialized automatically through google-services.json
            FirebaseApp.initializeApp(this)
            
            // Enable offline persistence for Firestore
            FirebaseFirestore.getInstance().firestoreSettings = 
                com.google.firebase.firestore.FirebaseFirestoreSettings.Builder()
                    .setPersistenceEnabled(true)
                    .build()

            // Set up Firebase Auth state listener
            val auth = FirebaseAuth.getInstance()
            
            Timber.d("$TAG: Firebase initialized successfully")
        } catch (e: Exception) {
            Timber.e(e, "$TAG: Firebase initialization failed")
        }
    }

    /**
     * Create notification channels for Android 8.0+
     */
    private fun createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Timber.d("$TAG: Creating notification channels")
            
            val notificationManager = getSystemService(NotificationManager::class.java)
            
            // Emergency Alerts Channel
            val emergencyChannel = NotificationChannel(
                NotificationChannelManager.CHANNEL_EMERGENCY_ALERTS,
                getString(R.string.notification_channel_emergency),
                NotificationManager.IMPORTANCE_MAX
            ).apply {
                description = getString(R.string.notification_channel_emergency_desc)
                enableVibration(true)
                enableLights(true)
                setSound(
                    android.net.Uri.parse("android.resource://${packageName}/raw/emergency_alert"),
                    android.media.AudioAttributes.Builder()
                        .setUsage(android.media.AudioAttributes.USAGE_ALARM)
                        .build()
                )
            }
            notificationManager?.createNotificationChannel(emergencyChannel)

            // Protection Active Channel
            val protectionChannel = NotificationChannel(
                NotificationChannelManager.CHANNEL_PROTECTION_ACTIVE,
                getString(R.string.notification_channel_protection),
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = getString(R.string.notification_channel_protection_desc)
                setShowBadge(true)
                enableVibration(false)
            }
            notificationManager?.createNotificationChannel(protectionChannel)

            // Location Updates Channel
            val locationChannel = NotificationChannel(
                NotificationChannelManager.CHANNEL_LOCATION_UPDATES,
                getString(R.string.notification_channel_location),
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = getString(R.string.notification_channel_location_desc)
                setShowBadge(false)
            }
            notificationManager?.createNotificationChannel(locationChannel)

            // Audio Alerts Channel
            val audioChannel = NotificationChannel(
                NotificationChannelManager.CHANNEL_AUDIO_ALERTS,
                getString(R.string.notification_channel_audio),
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = getString(R.string.notification_channel_audio_desc)
                enableVibration(true)
            }
            notificationManager?.createNotificationChannel(audioChannel)

            // General Alerts Channel
            val generalChannel = NotificationChannel(
                NotificationChannelManager.CHANNEL_GENERAL_ALERTS,
                getString(R.string.notification_channel_general),
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply {
                description = getString(R.string.notification_channel_general_desc)
            }
            notificationManager?.createNotificationChannel(generalChannel)

            Timber.d("$TAG: Notification channels created successfully")
        }
    }

    /**
     * Initialize local database
     */
    private fun initializeDatabase() {
        try {
            Timber.d("$TAG: Initializing database")
            val database = AppDatabase.getInstance(this)
            Timber.d("$TAG: Database initialized successfully")
        } catch (e: Exception) {
            Timber.e(e, "$TAG: Database initialization failed")
        }
    }

    /**
     * Initialize preferences
     */
    private fun initializePreferences() {
        try {
            Timber.d("$TAG: Initializing preferences")
            PreferencesManager.getInstance(this)
            Timber.d("$TAG: Preferences initialized successfully")
        } catch (e: Exception) {
            Timber.e(e, "$TAG: Preferences initialization failed")
        }
    }

    /**
     * Start the foreground protection service
     */
    private fun startProtectionService() {
        try {
            Timber.d("$TAG: Starting protection service")
            val prefs = PreferencesManager.getInstance(this)
            
            if (prefs.isProtectionEnabled()) {
                StreetSentinelForegroundService.start(this)
                Timber.d("$TAG: Protection service started")
            }
        } catch (e: Exception) {
            Timber.e(e, "$TAG: Failed to start protection service")
        }
    }

    /**
     * Custom Timber tree for Firebase Crashlytics
     */
    private class CrashlyticsTree : Timber.Tree() {
        override fun log(priority: Int, tag: String?, message: String, t: Throwable?) {
            val crashlytics = com.google.firebase.crashlytics.FirebaseCrashlytics.getInstance()
            
            when {
                priority == Log.ERROR && t != null -> {
                    crashlytics.recordException(t)
                }
                t != null -> {
                    crashlytics.recordException(t)
                }
                else -> {
                    crashlytics.log("[$tag] $message")
                }
            }
        }
    }
}
