package com.streetsentinel.services

import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import com.streetsentinel.R
import com.streetsentinel.ui.MainActivity
import com.streetsentinel.utils.NotificationChannelManager
import com.streetsentinel.utils.PreferencesManager
import com.streetsentinel.workers.AudioDetectionWorker
import com.streetsentinel.workers.LocationTrackingWorker
import com.streetsentinel.workers.HealthCheckWorker
import dagger.hilt.android.AndroidEntryPoint
import timber.log.Timber
import java.util.concurrent.TimeUnit
import javax.inject.Inject

/**
 * Foreground Service for StreetSentinel
 * 
 * Runs continuously in the foreground to:
 * - Monitor audio for distress sounds
 * - Track GPS location
 * - Manage emergency alerts
 * - Maintain system health
 * 
 * Works even when:
 * - App is minimized
 * - Screen is locked
 * - User is using other apps
 */
@AndroidEntryPoint
class StreetSentinelForegroundService : Service() {

    companion object {
        private const val TAG = "StreetSentinelForegroundService"
        private const val NOTIFICATION_ID = 1001
        private const val NOTIFICATION_TITLE = "🛡 StreetSentinel Protection Active"
        private const val NOTIFICATION_TEXT = "Monitoring Environment..."

        fun start(context: Context) {
            try {
                val intent = Intent(context, StreetSentinelForegroundService::class.java)
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    context.startForegroundService(intent)
                } else {
                    context.startService(intent)
                }
                Timber.d("$TAG: Service start requested")
            } catch (e: Exception) {
                Timber.e(e, "$TAG: Failed to start service")
            }
        }

        fun stop(context: Context) {
            val intent = Intent(context, StreetSentinelForegroundService::class.java)
            context.stopService(intent)
            Timber.d("$TAG: Service stop requested")
        }

        fun isRunning(context: Context): Boolean {
            val manager = context.getSystemService(Context.ACTIVITY_SERVICE) as android.app.ActivityManager
            return manager.getRunningServices(Int.MAX_VALUE).any {
                it.service.className == StreetSentinelForegroundService::class.java.name
            }
        }
    }

    @Inject
    lateinit var preferencesManager: PreferencesManager

    @Inject
    lateinit var notificationService: NotificationService

    private var isRunning = false

    override fun onCreate() {
        super.onCreate()
        Timber.d("$TAG: onCreate() called")
        setupNotificationChannels()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Timber.d("$TAG: onStartCommand() called")

        if (!isRunning) {
            isRunning = true
            
            // Start foreground notification
            startForeground(NOTIFICATION_ID, createNotification())
            
            // Initialize services
            initializeServices()
            
            // Schedule background workers
            scheduleBackgroundWorkers()
            
            Timber.d("$TAG: Service fully initialized")
        }

        // Restart if system kills the service
        return START_STICKY
    }

    override fun onDestroy() {
        super.onDestroy()
        Timber.d("$TAG: onDestroy() called")
        isRunning = false
        
        // Cleanup
        AudioDetectionService.stop(this)
        LocationTrackingService.stop(this)
        
        // Reschedule if protection is still enabled
        if (preferencesManager.isProtectionEnabled()) {
            Timber.d("$TAG: Rescheduling service")
            start(this)
        }
    }

    override fun onBind(intent: Intent?): IBinder? {
        return null
    }

    /**
     * Create notification for foreground service
     */
    private fun createNotification(): android.app.Notification {
        val notificationManager = NotificationChannelManager()
        
        val contentIntent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        }
        val pendingIntent = android.app.PendingIntent.getActivity(
            this,
            0,
            contentIntent,
            android.app.PendingIntent.FLAG_IMMUTABLE or android.app.PendingIntent.FLAG_UPDATE_CURRENT
        )

        return NotificationCompat.Builder(this, NotificationChannelManager.CHANNEL_PROTECTION_ACTIVE)
            .setContentTitle(NOTIFICATION_TITLE)
            .setContentText(NOTIFICATION_TEXT)
            .setSmallIcon(android.R.drawable.ic_lock_idle_lock)
            .setColor(ContextCompat.getColor(this, R.color.primary))
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setShowWhen(false)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }

    /**
     * Setup notification channels
     */
    private fun setupNotificationChannels() {
        NotificationChannelManager.createAllChannels(this)
    }

    /**
     * Initialize all services
     */
    private fun initializeServices() {
        try {
            // Start audio detection
            if (preferencesManager.isAudioDetectionEnabled()) {
                AudioDetectionService.start(this)
                Timber.d("$TAG: Audio detection started")
            }

            // Start location tracking
            if (preferencesManager.isLocationTrackingEnabled()) {
                LocationTrackingService.start(this)
                Timber.d("$TAG: Location tracking started")
            }
        } catch (e: Exception) {
            Timber.e(e, "$TAG: Error initializing services")
        }
    }

    /**
     * Schedule background workers for continuous monitoring
     */
    private fun scheduleBackgroundWorkers() {
        try {
            val workManager = WorkManager.getInstance(this)

            // Audio detection worker - runs every 30 seconds
            val audioDetectionWork = PeriodicWorkRequestBuilder<AudioDetectionWorker>(
                30,
                TimeUnit.SECONDS
            ).build()

            workManager.enqueueUniquePeriodicWork(
                "audio_detection",
                ExistingPeriodicWorkPolicy.KEEP,
                audioDetectionWork
            )
            Timber.d("$TAG: Audio detection worker scheduled")

            // Location tracking worker - runs every 60 seconds
            val locationTrackingWork = PeriodicWorkRequestBuilder<LocationTrackingWorker>(
                60,
                TimeUnit.SECONDS
            ).build()

            workManager.enqueueUniquePeriodicWork(
                "location_tracking",
                ExistingPeriodicWorkPolicy.KEEP,
                locationTrackingWork
            )
            Timber.d("$TAG: Location tracking worker scheduled")

            // Health check worker - runs every 5 minutes
            val healthCheckWork = PeriodicWorkRequestBuilder<HealthCheckWorker>(
                5,
                TimeUnit.MINUTES
            ).build()

            workManager.enqueueUniquePeriodicWork(
                "health_check",
                ExistingPeriodicWorkPolicy.KEEP,
                healthCheckWork
            )
            Timber.d("$TAG: Health check worker scheduled")

        } catch (e: Exception) {
            Timber.e(e, "$TAG: Error scheduling background workers")
        }
    }
}
