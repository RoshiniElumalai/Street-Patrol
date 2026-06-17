package com.streetsentinel.ui.viewmodels

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject

/**
 * Main View Model for MainActivity
 *
 * Manages navigation and global app state
 */
@HiltViewModel
class MainViewModel @Inject constructor() : ViewModel() {

    private val _navigationEvent = MutableLiveData<Int>()
    val navigationEvent: LiveData<Int> = _navigationEvent

    private val _toastMessage = MutableLiveData<String>()
    val toastMessage: LiveData<String> = _toastMessage

    fun navigateTo(destinationId: Int) {
        _navigationEvent.postValue(destinationId)
    }

    fun showToast(message: String) {
        _toastMessage.postValue(message)
    }
}
