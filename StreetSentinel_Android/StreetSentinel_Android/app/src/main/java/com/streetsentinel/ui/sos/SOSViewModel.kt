package com.streetsentinel.ui.sos

import android.app.Application
import android.content.Intent
import android.net.Uri
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.viewModelScope
import com.streetsentinel.data.models.Contact
import com.streetsentinel.data.repository.ContactRepository
import com.streetsentinel.managers.EmergencyAlertManager
import com.streetsentinel.utils.PreferencesManager
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import timber.log.Timber
import javax.inject.Inject

@HiltViewModel
class SOSViewModel @Inject constructor(
    application: Application,
    private val preferencesManager: PreferencesManager,
    private val emergencyAlertManager: EmergencyAlertManager,
    private val contactRepository: ContactRepository
) : AndroidViewModel(application) {

    private val _sosState = MutableLiveData(SOSState.IDLE)
    val sosState: LiveData<SOSState> = _sosState

    private val _nearbyContacts = MutableLiveData<List<Contact>>(emptyList())
    val nearbyContacts: LiveData<List<Contact>> = _nearbyContacts

    init {
        loadEmergencyContacts()
    }

    private fun loadEmergencyContacts() {
        viewModelScope.launch {
            try {
                val contacts = contactRepository.getEmergencyContacts()
                _nearbyContacts.postValue(contacts)
            } catch (e: Exception) {
                Timber.e(e, "SOSViewModel: Error loading contacts")
            }
        }
    }

    fun startSOSCountdown() {
        _sosState.value = SOSState.COUNTING_DOWN
    }

    fun triggerSOS() {
        viewModelScope.launch {
            try {
                _sosState.postValue(SOSState.ACTIVE)
                val location = preferencesManager.getLastKnownLocation()

                emergencyAlertManager.triggerEmergencyAlert(
                    threatType = "MANUAL_SOS",
                    confidence = 1.0f,
                    decibels = 0.0,
                    latitude = location.first,
                    longitude = location.second
                )

                // Also escalate immediately since this is manual
                emergencyAlertManager.escalateEmergency(
                    alertId = preferencesManager.getActiveAlertId(),
                    latitude = location.first,
                    longitude = location.second,
                    userPhone = preferencesManager.getUserPhone(),
                    userName = preferencesManager.getUserName()
                )

                Timber.d("SOSViewModel: Manual SOS triggered")
            } catch (e: Exception) {
                Timber.e(e, "SOSViewModel: Error triggering SOS")
            }
        }
    }

    fun cancelSOS() {
        viewModelScope.launch {
            try {
                _sosState.postValue(SOSState.CANCELLED)
                val alertId = preferencesManager.getActiveAlertId()
                if (alertId.isNotEmpty()) {
                    emergencyAlertManager.confirmUserSafe(alertId)
                }
                Timber.d("SOSViewModel: SOS cancelled")
            } catch (e: Exception) {
                Timber.e(e, "SOSViewModel: Error cancelling SOS")
            }
        }
    }

    fun shareLocationImmediately() {
        viewModelScope.launch {
            try {
                val location = preferencesManager.getLastKnownLocation()
                val mapsUrl = "https://www.google.com/maps?q=${location.first},${location.second}"
                val context = getApplication<Application>()

                val shareIntent = Intent(Intent.ACTION_SEND).apply {
                    type = "text/plain"
                    putExtra(Intent.EXTRA_TEXT,
                        "🚨 I need help! My location: $mapsUrl\n" +
                        "Name: ${preferencesManager.getUserName()}\n" +
                        "Phone: ${preferencesManager.getUserPhone()}")
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
                context.startActivity(Intent.createChooser(shareIntent, "Share Location").apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                })
            } catch (e: Exception) {
                Timber.e(e, "SOSViewModel: Error sharing location")
            }
        }
    }

    fun callEmergencyServices() {
        try {
            val context = getApplication<Application>()
            val callIntent = Intent(Intent.ACTION_CALL, Uri.parse("tel:112")).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            context.startActivity(callIntent)
        } catch (e: Exception) {
            Timber.e(e, "SOSViewModel: Error calling emergency services")
        }
    }
}
