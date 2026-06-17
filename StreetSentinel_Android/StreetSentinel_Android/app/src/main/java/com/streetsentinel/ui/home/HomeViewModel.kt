package com.streetsentinel.ui.home

import android.app.Application
import android.content.Context
import android.content.Intent
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.telephony.TelephonyManager
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.viewModelScope
import com.streetsentinel.data.models.SystemHealth
import com.streetsentinel.data.repository.AlertRepository
import com.streetsentinel.utils.PreferencesManager
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import timber.log.Timber
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import javax.inject.Inject
import kotlin.math.sqrt

@HiltViewModel
class HomeViewModel @Inject constructor(
    application: Application,
    private val preferencesManager: PreferencesManager,
    private val alertRepository: AlertRepository
) : AndroidViewModel(application), SensorEventListener {

    companion object {
        private const val TAG = "HomeViewModel"
        private const val SHAKE_THRESHOLD = 12f
    }

    private val _systemHealth = MutableLiveData<SystemHealth>()
    val systemHealth: LiveData<SystemHealth> = _systemHealth

    private val _isProtectionEnabled = MutableLiveData<Boolean>()
    val isProtectionEnabled: LiveData<Boolean> = _isProtectionEnabled

    private val _lastAlertTime = MutableLiveData<String>()
    val lastAlertTime: LiveData<String> = _lastAlertTime

    private val _alertCount = MutableLiveData<Int>()
    val alertCount: LiveData<Int> = _alertCount

    private val _shakeDetected = MutableLiveData<Boolean>()
    val shakeDetected: LiveData<Boolean> = _shakeDetected

    private val sensorManager =
        application.getSystemService(Context.SENSOR_SERVICE) as SensorManager
    private val accelerometer = sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)

    init {
        _isProtectionEnabled.value = preferencesManager.isProtectionEnabled()
        refreshSystemHealth()
        loadAlertStats()
        registerShakeDetection()
    }

    fun refreshSystemHealth() {
        viewModelScope.launch {
            try {
                val context = getApplication<Application>()
                val health = SystemHealth(
                    microphoneStatus = checkMicrophoneStatus(context),
                    gpsStatus = checkGpsStatus(context),
                    internetStatus = checkInternetStatus(context),
                    notificationStatus = checkNotificationStatus(context),
                    emailStatus = "OK",
                    databaseStatus = checkDatabaseStatus(),
                    protectionStatus = if (preferencesManager.isProtectionEnabled()) "ACTIVE" else "INACTIVE",
                    lastAlertTime = preferencesManager.getLastKnownLocation().first.toLong()
                )
                _systemHealth.postValue(health)
            } catch (e: Exception) {
                Timber.e(e, "$TAG: Error refreshing system health")
            }
        }
    }

    fun toggleProtection(enabled: Boolean) {
        preferencesManager.setProtectionEnabled(enabled)
        _isProtectionEnabled.value = enabled
        refreshSystemHealth()
    }

    fun triggerFakeCall() {
        try {
            val context = getApplication<Application>()
            val intent = Intent(context, com.streetsentinel.ui.fakecall.FakeCallActivity::class.java)
            intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
            context.startActivity(intent)
        } catch (e: Exception) {
            Timber.e(e, "$TAG: Error triggering fake call")
        }
    }

    private fun loadAlertStats() {
        viewModelScope.launch {
            try {
                val userId = preferencesManager.getUserId()
                val count = alertRepository.getAlertCount(userId)
                _alertCount.postValue(count)

                val lastAlert = alertRepository.getRecentAlerts(userId).firstOrNull()
                if (lastAlert != null) {
                    val sdf = SimpleDateFormat("dd MMM, HH:mm", Locale.getDefault())
                    _lastAlertTime.postValue(sdf.format(Date(lastAlert.timestamp)))
                } else {
                    _lastAlertTime.postValue("No alerts yet")
                }
            } catch (e: Exception) {
                Timber.e(e, "$TAG: Error loading alert stats")
            }
        }
    }

    private fun registerShakeDetection() {
        if (preferencesManager.isShakeDetectionEnabled()) {
            accelerometer?.let {
                sensorManager.registerListener(this, it, SensorManager.SENSOR_DELAY_NORMAL)
            }
        }
    }

    override fun onSensorChanged(event: SensorEvent?) {
        if (event?.sensor?.type == Sensor.TYPE_ACCELEROMETER) {
            val x = event.values[0]
            val y = event.values[1]
            val z = event.values[2]
            val acceleration = sqrt((x * x + y * y + z * z).toDouble()).toFloat() - SensorManager.GRAVITY_EARTH

            if (acceleration > SHAKE_THRESHOLD) {
                Timber.d("$TAG: Shake detected - acceleration: $acceleration")
                _shakeDetected.postValue(true)
            }
        }
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {}

    private fun checkMicrophoneStatus(context: Context): String {
        return try {
            val pm = context.packageManager
            if (pm.hasSystemFeature(android.content.pm.PackageManager.FEATURE_MICROPHONE)) "OK"
            else "NOT_AVAILABLE"
        } catch (e: Exception) { "ERROR" }
    }

    private fun checkGpsStatus(context: Context): String {
        return try {
            val locationManager =
                context.getSystemService(Context.LOCATION_SERVICE) as android.location.LocationManager
            if (locationManager.isProviderEnabled(android.location.LocationManager.GPS_PROVIDER)) "OK"
            else "DISABLED"
        } catch (e: Exception) { "ERROR" }
    }

    private fun checkInternetStatus(context: Context): String {
        return try {
            val cm = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
            val network = cm.activeNetwork
            val capabilities = cm.getNetworkCapabilities(network)
            if (capabilities?.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) == true) "OK"
            else "NO_CONNECTION"
        } catch (e: Exception) { "ERROR" }
    }

    private fun checkNotificationStatus(context: Context): String {
        return try {
            val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as android.app.NotificationManager
            if (nm.areNotificationsEnabled()) "OK" else "DISABLED"
        } catch (e: Exception) { "ERROR" }
    }

    private suspend fun checkDatabaseStatus(): String {
        return try {
            alertRepository.getAlertCount(preferencesManager.getUserId())
            "OK"
        } catch (e: Exception) { "ERROR" }
    }

    override fun onCleared() {
        super.onCleared()
        sensorManager.unregisterListener(this)
    }
}
