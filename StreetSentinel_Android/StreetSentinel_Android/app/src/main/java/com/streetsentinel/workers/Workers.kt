package com.streetsentinel.workers

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.streetsentinel.services.AudioDetectionService
import com.streetsentinel.services.LocationTrackingService
import com.streetsentinel.utils.PreferencesManager
import timber.log.Timber
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject

/**
 * Audio Detection Worker
 *
 * Periodic work for continuous audio monitoring
 */
class AudioDetectionWorker(
    context: Context,
    params: WorkerParameters
) : CoroutineWorker(context, params) {

    companion object {
        private const val TAG = "AudioDetectionWorker"
    }

    override suspend fun doWork(): Result {
        return try {
            Timber.d("$TAG: Running audio detection work")

            // Audio detection service should be running
            // This worker ensures it stays active
            AudioDetectionService.start(applicationContext)

            Result.success()
        } catch (e: Exception) {
            Timber.e(e, "$TAG: Error in audio detection work")
            Result.retry()
        }
    }
}

/**
 * Location Tracking Worker
 *
 * Periodic work for continuous location tracking
 */
class LocationTrackingWorker(
    context: Context,
    params: WorkerParameters
) : CoroutineWorker(context, params) {

    companion object {
        private const val TAG = "LocationTrackingWorker"
    }

    override suspend fun doWork(): Result {
        return try {
            Timber.d("$TAG: Running location tracking work")

            // Location tracking service should be running
            LocationTrackingService.start(applicationContext)

            Result.success()
        } catch (e: Exception) {
            Timber.e(e, "$TAG: Error in location tracking work")
            Result.retry()
        }
    }
}

/**
 * Health Check Worker
 *
 * Periodic work to verify system health
 */
class HealthCheckWorker(
    context: Context,
    params: WorkerParameters
) : CoroutineWorker(context, params) {

    companion object {
        private const val TAG = "HealthCheckWorker"
    }

    override suspend fun doWork(): Result {
        return try {
            Timber.d("$TAG: Running system health check")

            // Check if services are running
            val context = applicationContext
            val foregroundServiceRunning = com.streetsentinel.services.StreetSentinelForegroundService
                .isRunning(context)

            if (!foregroundServiceRunning) {
                Timber.w("$TAG: Foreground service not running - restarting")
                com.streetsentinel.services.StreetSentinelForegroundService.start(context)
            }

            Result.success()
        } catch (e: Exception) {
            Timber.e(e, "$TAG: Error in health check work")
            Result.retry()
        }
    }
}

/**
 * Sync Data Worker
 *
 * Periodic work to sync local data with Firebase
 */
class SyncDataWorker(
    context: Context,
    params: WorkerParameters
) : CoroutineWorker(context, params) {

    companion object {
        private const val TAG = "SyncDataWorker"
    }

    override suspend fun doWork(): Result {
        return try {
            Timber.d("$TAG: Running data sync work")

            // Sync locations, alerts, and other data with Firebase
            // Implementation depends on your data sync strategy

            Result.success()
        } catch (e: Exception) {
            Timber.e(e, "$TAG: Error in sync data work")
            Result.retry()
        }
    }
}

/**
 * Check-in Reminder Worker
 *
 * Sends check-in reminders for active SafeWalk sessions
 */
class CheckInReminderWorker(
    context: Context,
    params: WorkerParameters
) : CoroutineWorker(context, params) {

    companion object {
        private const val TAG = "CheckInReminderWorker"
    }

    override suspend fun doWork(): Result {
        return try {
            Timber.d("$TAG: Running check-in reminder work")

            // Check for active SafeWalk sessions
            val prefs = PreferencesManager.getInstance(applicationContext)
            val session = prefs.getActiveSafeWalkSession()

            if (session != null) {
                val timeElapsed = System.currentTimeMillis() - session.lastUpdateTime
                if (timeElapsed > session.checkInTimeout) {
                    Timber.w("$TAG: Check-in timeout reached")
                    // This will be handled by the SafeWalk service
                }
            }

            Result.success()
        } catch (e: Exception) {
            Timber.e(e, "$TAG: Error in check-in reminder work")
            Result.retry()
        }
    }
}
