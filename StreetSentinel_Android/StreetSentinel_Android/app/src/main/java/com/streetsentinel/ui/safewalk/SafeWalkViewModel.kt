package com.streetsentinel.ui.safewalk

import android.app.Application
import android.content.Context
import android.location.Geocoder
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.viewModelScope
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.LocationServices
import com.streetsentinel.data.models.SafeWalkSession
import com.streetsentinel.data.repository.LocationRepository
import com.streetsentinel.managers.EmergencyAlertManager
import com.streetsentinel.utils.PreferencesManager
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import timber.log.Timber
import java.util.Locale
import java.util.UUID
import javax.inject.Inject
import kotlin.math.sqrt

@HiltViewModel
class SafeWalkViewModel @Inject constructor(
    application: Application,
    private val preferencesManager: PreferencesManager,
    private val locationRepository: LocationRepository,
    private val emergencyAlertManager: EmergencyAlertManager
) : AndroidViewModel(application) {

    private val fusedLocationClient: FusedLocationProviderClient =
        LocationServices.getFusedLocationProviderClient(application)

    private val _safeWalkSession = MutableLiveData<SafeWalkSession?>()
    val safeWalkSession: LiveData<SafeWalkSession?> = _safeWalkSession

    private val _isWalkActive = MutableLiveData(false)
    val isWalkActive: LiveData<Boolean> = _isWalkActive

    private val _distanceToDestination = MutableLiveData(0f)
    val distanceToDestination: LiveData<Float> = _distanceToDestination

    private val _eta = MutableLiveData(0L)
    val eta: LiveData<Long> = _eta

    private val _checkInRequired = MutableLiveData(false)
    val checkInRequired: LiveData<Boolean> = _checkInRequired

    fun startSafeWalk(destinationName: String, checkInMinutes: Int) {
        viewModelScope.launch {
            try {
                // Geocode destination
                val geocoder = Geocoder(getApplication(), Locale.getDefault())
                val results = geocoder.getFromLocationName(destinationName, 1)

                if (results.isNullOrEmpty()) {
                    Timber.w("Could not geocode destination: $destinationName")
                    return@launch
                }

                val destLat = results[0].latitude
                val destLng = results[0].longitude

                // Get current location
                getCurrentLocation { currentLat, currentLng ->
                    val distance = calculateDistance(currentLat, currentLng, destLat, destLng)
                    val walkingSpeedMps = 1.4f // average 1.4 m/s
                    val etaMs = (distance / walkingSpeedMps * 1000).toLong()

                    val session = SafeWalkSession(
                        sessionId = UUID.randomUUID().toString(),
                        userId = preferencesManager.getUserId(),
                        destinationName = destinationName,
                        destinationLatitude = destLat,
                        destinationLongitude = destLng,
                        lastKnownLatitude = currentLat,
                        lastKnownLongitude = currentLng,
                        distance = distance,
                        eta = etaMs,
                        checkInTimeout = checkInMinutes * 60 * 1000L,
                        status = "ACTIVE"
                    )

                    viewModelScope.launch {
                        locationRepository.createSafeWalkSession(session)
                        preferencesManager.setActiveSafeWalkSession(
                            com.google.gson.Gson().toJson(session)
                        )

                        _safeWalkSession.postValue(session)
                        _isWalkActive.postValue(true)
                        _distanceToDestination.postValue(distance)
                        _eta.postValue(etaMs)

                        Timber.d("SafeWalkViewModel: SafeWalk started to $destinationName (${formatDistance(distance)})")
                    }
                }
            } catch (e: Exception) {
                Timber.e(e, "SafeWalkViewModel: Error starting SafeWalk")
            }
        }
    }

    fun endSafeWalk() {
        viewModelScope.launch {
            try {
                val session = _safeWalkSession.value ?: return@launch
                locationRepository.updateSafeWalkSession(session.copy(status = "COMPLETED"))
                preferencesManager.clearActiveSafeWalkSession()
                _safeWalkSession.postValue(null)
                _isWalkActive.postValue(false)
                Timber.d("SafeWalkViewModel: SafeWalk ended")
            } catch (e: Exception) {
                Timber.e(e, "SafeWalkViewModel: Error ending SafeWalk")
            }
        }
    }

    fun performCheckIn() {
        viewModelScope.launch {
            try {
                val session = _safeWalkSession.value ?: return@launch
                locationRepository.markSafeWalkAsCompleted(session.sessionId)
                _checkInRequired.postValue(false)
                Timber.d("SafeWalkViewModel: Check-in performed")
            } catch (e: Exception) {
                Timber.e(e, "SafeWalkViewModel: Error performing check-in")
            }
        }
    }

    fun shareCurrentLocation() {
        viewModelScope.launch {
            try {
                val location = preferencesManager.getLastKnownLocation()
                val mapsUrl = "https://www.google.com/maps?q=${location.first},${location.second}"

                val context = getApplication<Application>()
                val shareIntent = android.content.Intent(android.content.Intent.ACTION_SEND).apply {
                    type = "text/plain"
                    putExtra(android.content.Intent.EXTRA_TEXT, "My current location: $mapsUrl")
                }
                shareIntent.flags = android.content.Intent.FLAG_ACTIVITY_NEW_TASK
                context.startActivity(android.content.Intent.createChooser(shareIntent, "Share Location").also {
                    it.flags = android.content.Intent.FLAG_ACTIVITY_NEW_TASK
                })
            } catch (e: Exception) {
                Timber.e(e, "SafeWalkViewModel: Error sharing location")
            }
        }
    }

    fun triggerEmergency() {
        viewModelScope.launch {
            try {
                val location = preferencesManager.getLastKnownLocation()
                emergencyAlertManager.triggerEmergencyAlert(
                    threatType = "SAFEWALK_NO_CHECKIN",
                    confidence = 1.0f,
                    decibels = 0.0,
                    latitude = location.first,
                    longitude = location.second
                )
            } catch (e: Exception) {
                Timber.e(e, "SafeWalkViewModel: Error triggering emergency")
            }
        }
    }

    private fun getCurrentLocation(callback: (Double, Double) -> Unit) {
        try {
            fusedLocationClient.lastLocation.addOnSuccessListener { location ->
                if (location != null) {
                    preferencesManager.setLastKnownLocation(location.latitude, location.longitude)
                    callback(location.latitude, location.longitude)
                } else {
                    val saved = preferencesManager.getLastKnownLocation()
                    callback(saved.first, saved.second)
                }
            }
        } catch (e: SecurityException) {
            Timber.e(e, "SafeWalkViewModel: Location permission not granted")
        }
    }

    private fun calculateDistance(lat1: Double, lng1: Double, lat2: Double, lng2: Double): Float {
        val results = FloatArray(1)
        android.location.Location.distanceBetween(lat1, lng1, lat2, lng2, results)
        return results[0]
    }

    private fun formatDistance(meters: Float): String {
        return if (meters >= 1000) "%.1f km".format(meters / 1000) else "${meters.toInt()} m"
    }
}
