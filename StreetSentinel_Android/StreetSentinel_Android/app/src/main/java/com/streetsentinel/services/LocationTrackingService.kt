package com.streetsentinel.services

import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import android.os.Looper
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.LocationCallback
import com.google.android.gms.location.LocationRequest
import com.google.android.gms.location.LocationResult
import com.google.android.gms.location.Priority
import com.streetsentinel.R
import com.streetsentinel.data.models.LocationSnapshot
import com.streetsentinel.data.models.SafeWalkSession
import com.streetsentinel.data.repository.LocationRepository
import com.streetsentinel.utils.NotificationChannelManager
import com.streetsentinel.utils.PreferencesManager
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import timber.log.Timber
import javax.inject.Inject

/**
 * Location Tracking Service
 * 
 * Continuously tracks GPS location for:
 * - SafeWalk mode
 * - Emergency location sharing
 * - Route history
 * - Check-in verification
 * 
 * Works even when app is in background
 */
@AndroidEntryPoint
class LocationTrackingService : Service() {

    companion object {
        private const val TAG = "LocationTrackingService"
        private const val NOTIFICATION_ID = 1003
        
        // Location update intervals
        private const val UPDATE_INTERVAL = 30000L // 30 seconds
        private const val FASTEST_INTERVAL = 10000L // 10 seconds
        private const val MAX_WAIT_TIME = 120000L // 2 minutes

        fun start(context: Context) {
            val intent = Intent(context, LocationTrackingService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }

        fun stop(context: Context) {
            val intent = Intent(context, LocationTrackingService::class.java)
            context.stopService(intent)
        }
    }

    @Inject
    lateinit var preferencesManager: PreferencesManager

    @Inject
    lateinit var locationRepository: LocationRepository

    @Inject
    lateinit var fusedLocationClient: FusedLocationProviderClient

    private var isTracking = false
    private var serviceJob: Job? = null
    private val serviceScope = CoroutineScope(Dispatchers.IO + Job())

    private lateinit var locationRequest: LocationRequest
    private lateinit var locationCallback: LocationCallback

    override fun onCreate() {
        super.onCreate()
        Timber.d("$TAG: onCreate() called")
        setupLocationRequest()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Timber.d("$TAG: onStartCommand() called")

        if (!isTracking) {
            isTracking = true
            startForeground(NOTIFICATION_ID, createNotification())
            startLocationTracking()
        }

        return START_STICKY
    }

    override fun onDestroy() {
        super.onDestroy()
        Timber.d("$TAG: onDestroy() called")
        stopLocationTracking()
        serviceScope.cancel()
    }

    override fun onBind(intent: Intent?): IBinder? {
        return null
    }

    /**
     * Create notification for the service
     */
    private fun createNotification(): android.app.Notification {
        val contentIntent = android.app.PendingIntent.getActivity(
            this,
            0,
            Intent(this, com.streetsentinel.ui.MainActivity::class.java),
            android.app.PendingIntent.FLAG_IMMUTABLE or android.app.PendingIntent.FLAG_UPDATE_CURRENT
        )

        return NotificationCompat.Builder(this, NotificationChannelManager.CHANNEL_LOCATION_UPDATES)
            .setContentTitle("📍 Location Tracking Active")
            .setContentText("Tracking your location...")
            .setSmallIcon(android.R.drawable.ic_menu_mylocation)
            .setColor(ContextCompat.getColor(this, R.color.primary))
            .setContentIntent(contentIntent)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }

    /**
     * Setup location request with appropriate parameters
     */
    private fun setupLocationRequest() {
        locationRequest = LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, UPDATE_INTERVAL)
            .setMinUpdateIntervalMillis(FASTEST_INTERVAL)
            .setMaxUpdateDelayMillis(MAX_WAIT_TIME)
            .setWaitForAccurateLocation(false)
            .build()

        locationCallback = object : LocationCallback() {
            override fun onLocationResult(locationResult: LocationResult) {
                for (location in locationResult.locations) {
                    handleLocationUpdate(location)
                }
            }
        }

        Timber.d("$TAG: Location request setup completed")
    }

    /**
     * Start location tracking
     */
    private fun startLocationTracking() {
        try {
            Timber.d("$TAG: Starting location tracking")

            fusedLocationClient.requestLocationUpdates(
                locationRequest,
                locationCallback,
                Looper.getMainLooper()
            )

            Timber.d("$TAG: Location tracking started")
        } catch (e: SecurityException) {
            Timber.e(e, "$TAG: Missing location permissions")
            stopSelf()
        } catch (e: Exception) {
            Timber.e(e, "$TAG: Failed to start location tracking")
            stopSelf()
        }
    }

    /**
     * Stop location tracking
     */
    private fun stopLocationTracking() {
        try {
            Timber.d("$TAG: Stopping location tracking")
            fusedLocationClient.removeLocationUpdates(locationCallback)
            isTracking = false
            Timber.d("$TAG: Location tracking stopped")
        } catch (e: Exception) {
            Timber.e(e, "$TAG: Error stopping location tracking")
        }
    }

    /**
     * Handle location update
     */
    private fun handleLocationUpdate(location: android.location.Location) {
        try {
            Timber.d(
                "$TAG: Location update - Lat: ${location.latitude}, Lng: ${location.longitude}, " +
                        "Accuracy: ${location.accuracy}m"
            )

            val locationSnapshot = LocationSnapshot(
                latitude = location.latitude,
                longitude = location.longitude,
                accuracy = location.accuracy,
                altitude = location.altitude,
                bearing = location.bearing,
                speed = location.speed,
                timestamp = location.time,
                provider = location.provider ?: "unknown"
            )

            // Save to database
            serviceScope.launch {
                try {
                    locationRepository.saveLocationSnapshot(locationSnapshot)
                    
                    // Update SafeWalk session if active
                    val safeWalkSession = preferencesManager.getActiveSafeWalkSession()
                    if (safeWalkSession != null) {
                        updateSafeWalkSession(safeWalkSession, locationSnapshot)
                    }

                    // Broadcast location update
                    broadcastLocationUpdate(locationSnapshot)

                } catch (e: Exception) {
                    Timber.e(e, "$TAG: Error saving location")
                }
            }

        } catch (e: Exception) {
            Timber.e(e, "$TAG: Error handling location update")
        }
    }

    /**
     * Update SafeWalk session with new location
     */
    private suspend fun updateSafeWalkSession(
        session: SafeWalkSession,
        location: LocationSnapshot
    ) {
        try {
            val updatedSession = session.copy(
                lastKnownLatitude = location.latitude,
                lastKnownLongitude = location.longitude,
                lastUpdateTime = System.currentTimeMillis(),
                routeHistory = session.routeHistory + listOf(
                    "${location.latitude},${location.longitude}"
                )
            )

            locationRepository.updateSafeWalkSession(updatedSession)
            
            Timber.d("$TAG: SafeWalk session updated")

            // Check for arrival
            checkForArrival(updatedSession, location)

        } catch (e: Exception) {
            Timber.e(e, "$TAG: Error updating SafeWalk session")
        }
    }

    /**
     * Check if user has arrived at destination
     */
    private suspend fun checkForArrival(
        session: SafeWalkSession,
        currentLocation: LocationSnapshot
    ) {
        try {
            val distanceToDestination = calculateDistance(
                currentLocation.latitude,
                currentLocation.longitude,
                session.destinationLatitude,
                session.destinationLongitude
            )

            Timber.d("$TAG: Distance to destination: ${String.format("%.0f", distanceToDestination)}m")

            // Within 50 meters = arrived
            if (distanceToDestination < 50) {
                Timber.d("$TAG: User has arrived at destination")
                
                locationRepository.markSafeWalkAsCompleted(session.sessionId)
                
                // Broadcast arrival
                val intent = Intent("com.streetsentinel.SAFEWALK_ARRIVAL").apply {
                    putExtra("sessionId", session.sessionId)
                }
                sendBroadcast(intent)
            }

        } catch (e: Exception) {
            Timber.e(e, "$TAG: Error checking for arrival")
        }
    }

    /**
     * Calculate distance between two coordinates using Haversine formula
     */
    private fun calculateDistance(lat1: Double, lng1: Double, lat2: Double, lng2: Double): Double {
        val earthRadius = 6371000 // in meters
        val dLat = Math.toRadians(lat2 - lat1)
        val dLng = Math.toRadians(lng2 - lng1)
        
        val a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) *
                Math.sin(dLng / 2) * Math.sin(dLng / 2)
        
        val c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
        
        return earthRadius * c
    }

    /**
     * Broadcast location update to UI
     */
    private fun broadcastLocationUpdate(location: LocationSnapshot) {
        try {
            val intent = Intent("com.streetsentinel.LOCATION_UPDATE").apply {
                putExtra("latitude", location.latitude)
                putExtra("longitude", location.longitude)
                putExtra("accuracy", location.accuracy)
                putExtra("timestamp", location.timestamp)
            }
            sendBroadcast(intent)
        } catch (e: Exception) {
            Timber.e(e, "$TAG: Error broadcasting location update")
        }
    }
}
