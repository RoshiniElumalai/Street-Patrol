package com.streetsentinel.ui.emergency

import android.os.Bundle
import android.os.CountDownTimer
import android.view.WindowManager
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.streetsentinel.R
import com.streetsentinel.databinding.ActivityEmergencyAlertBinding
import com.streetsentinel.managers.EmergencyAlertManager
import com.streetsentinel.utils.PreferencesManager
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.launch
import timber.log.Timber
import javax.inject.Inject

/**
 * Emergency Alert Activity
 *
 * Shows on lock screen when threat is detected.
 * Has countdown before auto-escalation.
 */
@AndroidEntryPoint
class EmergencyAlertActivity : AppCompatActivity() {

    private lateinit var binding: ActivityEmergencyAlertBinding
    private var countdownTimer: CountDownTimer? = null

    @Inject
    lateinit var emergencyAlertManager: EmergencyAlertManager

    @Inject
    lateinit var preferencesManager: PreferencesManager

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Show on lock screen
        window.addFlags(
            WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON or
            WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD or
            WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
            WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
        )

        binding = ActivityEmergencyAlertBinding.inflate(layoutInflater)
        setContentView(binding.root)

        val title = intent.getStringExtra("title") ?: "⚠ Possible Emergency"
        val message = intent.getStringExtra("message") ?: "Are you safe?"
        val threatType = intent.getStringExtra("threatType") ?: "Unknown"
        val latitude = intent.getDoubleExtra("latitude", 0.0)
        val longitude = intent.getDoubleExtra("longitude", 0.0)
        val confidence = intent.getFloatExtra("confidence", 0f)

        setupUI(title, message, threatType, confidence, latitude, longitude)
        startCountdown()
    }

    override fun onDestroy() {
        super.onDestroy()
        countdownTimer?.cancel()
    }

    private fun setupUI(
        title: String,
        message: String,
        threatType: String,
        confidence: Float,
        latitude: Double,
        longitude: Double
    ) {
        with(binding) {
            tvTitle.text = title
            tvMessage.text = message
            tvThreatType.text = "Detected: $threatType"
            tvConfidence.text = "Confidence: ${(confidence * 100).toInt()}%"

            if (latitude != 0.0 && longitude != 0.0) {
                tvLocation.text = "Location: %.4f, %.4f".format(latitude, longitude)
            } else {
                tvLocation.text = "Fetching location..."
            }

            // "I'm Safe" Button
            btnImSafe.setOnClickListener {
                Timber.d("EmergencyAlertActivity: User confirmed safe")
                val alertId = preferencesManager.getActiveAlertId()
                if (alertId.isNotEmpty()) {
                    emergencyAlertManager.confirmUserSafe(alertId)
                }
                countdownTimer?.cancel()
                finish()
            }

            // "Send Location Now" Button
            btnSendLocation.setOnClickListener {
                Timber.d("EmergencyAlertActivity: User clicked send location")
                lifecycleScope.launch {
                    emergencyAlertManager.escalateEmergency(
                        alertId = preferencesManager.getActiveAlertId(),
                        latitude = latitude,
                        longitude = longitude,
                        userPhone = preferencesManager.getUserPhone(),
                        userName = preferencesManager.getUserName()
                    )
                }
                countdownTimer?.cancel()
                binding.tvCountdown.text = "✓ Location Sent!"
                binding.btnSendLocation.isEnabled = false
                binding.btnImSafe.text = "Close"
            }
        }
    }

    private fun startCountdown() {
        val autoEscalateTime = preferencesManager.getAutoEscalateTime()

        countdownTimer = object : CountDownTimer(autoEscalateTime, 1000) {
            override fun onTick(millisUntilFinished: Long) {
                binding.tvCountdown.text = "Auto-sending in: ${millisUntilFinished / 1000}s"
            }

            override fun onFinish() {
                Timber.d("EmergencyAlertActivity: Countdown finished - auto escalating")
                binding.tvCountdown.text = "Sending emergency alert..."
                lifecycleScope.launch {
                    val location = preferencesManager.getLastKnownLocation()
                    emergencyAlertManager.escalateEmergency(
                        alertId = preferencesManager.getActiveAlertId(),
                        latitude = location.first,
                        longitude = location.second,
                        userPhone = preferencesManager.getUserPhone(),
                        userName = preferencesManager.getUserName()
                    )
                    finish()
                }
            }
        }.start()
    }
}
