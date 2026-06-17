package com.streetsentinel.services

import android.app.Service
import android.content.Context
import android.content.Intent
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import com.streetsentinel.R
import com.streetsentinel.data.models.ThreatLevel
import com.streetsentinel.data.models.AudioEvent
import com.streetsentinel.managers.EmergencyAlertManager
import com.streetsentinel.managers.AudioAnalysisManager
import com.streetsentinel.utils.NotificationChannelManager
import com.streetsentinel.utils.PreferencesManager
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import timber.log.Timber
import java.util.Date
import javax.inject.Inject
import kotlin.math.sqrt

/**
 * Audio Detection Service
 * 
 * Continuously monitors microphone input for distress sounds:
 * - Scream detection
 * - Help detection
 * - Distress sounds
 * - Glass breaking
 * - Shouting
 * 
 * Uses audio levels and ML-based detection
 */
@AndroidEntryPoint
class AudioDetectionService : Service() {

    companion object {
        private const val TAG = "AudioDetectionService"
        private const val NOTIFICATION_ID = 1002
        
        // Audio configuration
        private const val SAMPLE_RATE = 44100
        private const val CHANNEL_CONFIG = AudioFormat.CHANNEL_IN_MONO
        private const val AUDIO_FORMAT = AudioFormat.ENCODING_PCM_16BIT
        
        // Buffer size
        private const val BUFFER_SIZE_MULTIPLIER = 2
        
        // Thresholds
        private const val SCREAM_THRESHOLD_DB = 85.0
        private const val HIGH_FREQUENCY_THRESHOLD_DB = 80.0
        private const val DETECTION_CONFIDENCE_THRESHOLD = 0.7f
        
        fun start(context: Context) {
            val intent = Intent(context, AudioDetectionService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }

        fun stop(context: Context) {
            val intent = Intent(context, AudioDetectionService::class.java)
            context.stopService(intent)
        }
    }

    @Inject
    lateinit var preferencesManager: PreferencesManager

    @Inject
    lateinit var emergencyAlertManager: EmergencyAlertManager

    @Inject
    lateinit var audioAnalysisManager: AudioAnalysisManager

    private var audioRecord: AudioRecord? = null
    private var isListening = false
    private var serviceJob: Job? = null
    private val serviceScope = CoroutineScope(Dispatchers.Default + Job())

    override fun onCreate() {
        super.onCreate()
        Timber.d("$TAG: onCreate() called")
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Timber.d("$TAG: onStartCommand() called")

        if (!isListening) {
            isListening = true
            startForeground(NOTIFICATION_ID, createNotification())
            startAudioMonitoring()
        }

        return START_STICKY
    }

    override fun onDestroy() {
        super.onDestroy()
        Timber.d("$TAG: onDestroy() called")
        stopAudioMonitoring()
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

        return NotificationCompat.Builder(this, NotificationChannelManager.CHANNEL_AUDIO_ALERTS)
            .setContentTitle("🎤 Audio Monitoring Active")
            .setContentText("Listening for distress sounds...")
            .setSmallIcon(android.R.drawable.ic_btn_speak_now)
            .setColor(ContextCompat.getColor(this, R.color.primary))
            .setContentIntent(contentIntent)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }

    /**
     * Start audio monitoring
     */
    private fun startAudioMonitoring() {
        try {
            Timber.d("$TAG: Starting audio monitoring")

            // Calculate buffer size
            val bufferSize = AudioRecord.getMinBufferSize(SAMPLE_RATE, CHANNEL_CONFIG, AUDIO_FORMAT) * BUFFER_SIZE_MULTIPLIER

            // Create audio record
            audioRecord = AudioRecord(
                MediaRecorder.AudioSource.MIC,
                SAMPLE_RATE,
                CHANNEL_CONFIG,
                AUDIO_FORMAT,
                bufferSize
            )

            // Start recording
            audioRecord?.startRecording()
            Timber.d("$TAG: Audio recording started")

            // Start monitoring coroutine
            serviceJob = serviceScope.launch {
                monitorAudioBuffer()
            }

        } catch (e: Exception) {
            Timber.e(e, "$TAG: Failed to start audio monitoring")
            stopSelf()
        }
    }

    /**
     * Stop audio monitoring
     */
    private fun stopAudioMonitoring() {
        try {
            Timber.d("$TAG: Stopping audio monitoring")
            
            isListening = false
            audioRecord?.stop()
            audioRecord?.release()
            audioRecord = null
            serviceJob?.cancel()
            
            Timber.d("$TAG: Audio monitoring stopped")
        } catch (e: Exception) {
            Timber.e(e, "$TAG: Error stopping audio monitoring")
        }
    }

    /**
     * Monitor audio buffer for threats
     */
    private suspend fun monitorAudioBuffer() {
        try {
            val audioRecord = audioRecord ?: return
            val bufferSize = AudioRecord.getMinBufferSize(SAMPLE_RATE, CHANNEL_CONFIG, AUDIO_FORMAT) * BUFFER_SIZE_MULTIPLIER
            val audioBuffer = ShortArray(bufferSize)

            while (isListening && audioRecord.recordingState == AudioRecord.RECORDSTATE_RECORDING) {
                try {
                    // Read audio data
                    val numRead = audioRecord.read(audioBuffer, 0, bufferSize)

                    if (numRead > 0) {
                        // Analyze audio
                        analyzeAudio(audioBuffer, numRead)
                    }

                    // Small delay to prevent CPU overload
                    delay(100)

                } catch (e: Exception) {
                    Timber.e(e, "$TAG: Error reading audio buffer")
                    delay(1000) // Longer delay on error
                }
            }
        } catch (e: Exception) {
            Timber.e(e, "$TAG: Error in monitorAudioBuffer")
        }
    }

    /**
     * Analyze audio buffer for threats
     */
    private fun analyzeAudio(audioBuffer: ShortArray, numRead: Int) {
        try {
            // Calculate audio levels
            val decibels = calculateDecibels(audioBuffer, numRead)
            
            Timber.v("$TAG: Current audio level: ${String.format("%.1f", decibels)} dB")

            // Check for scream/distress
            if (decibels >= SCREAM_THRESHOLD_DB) {
                Timber.w("$TAG: High audio level detected: ${String.format("%.1f", decibels)} dB")
                
                // Perform ML-based analysis
                val threatAnalysis = audioAnalysisManager.analyzeThreat(audioBuffer, numRead, decibels)
                
                if (threatAnalysis.confidence >= DETECTION_CONFIDENCE_THRESHOLD) {
                    Timber.e("$TAG: THREAT DETECTED - Type: ${threatAnalysis.type}, Confidence: ${threatAnalysis.confidence}")
                    
                    // Save audio event
                    val audioEvent = AudioEvent(
                        timestamp = Date().time,
                        soundType = threatAnalysis.type,
                        decibels = decibels,
                        confidence = threatAnalysis.confidence,
                        threatLevel = determineThreatLevel(threatAnalysis.confidence, decibels)
                    )
                    saveAudioEvent(audioEvent)
                    
                    // Trigger emergency alert
                    emergencyAlertManager.triggerEmergencyAlert(
                        threatType = threatAnalysis.type,
                        confidence = threatAnalysis.confidence,
                        decibels = decibels
                    )
                }
            }

            // Update UI with current audio level
            updateAudioMeter(decibels)

        } catch (e: Exception) {
            Timber.e(e, "$TAG: Error analyzing audio")
        }
    }

    /**
     * Calculate decibels from audio buffer
     */
    private fun calculateDecibels(audioBuffer: ShortArray, numRead: Int): Double {
        try {
            var sumOfSquares = 0.0
            
            for (i in 0 until numRead) {
                val sample = audioBuffer[i].toDouble() / 32768.0
                sumOfSquares += sample * sample
            }

            val rms = sqrt(sumOfSquares / numRead)
            
            // Convert to decibels (reference is 1.0)
            val db = if (rms > 0) 20 * Math.log10(rms) + 90 else 0.0
            
            return db.coerceIn(0.0, 120.0)
        } catch (e: Exception) {
            Timber.e(e, "$TAG: Error calculating decibels")
            return 0.0
        }
    }

    /**
     * Determine threat level based on analysis
     */
    private fun determineThreatLevel(confidence: Float, decibels: Double): ThreatLevel {
        return when {
            confidence >= 0.9f && decibels >= 95.0 -> ThreatLevel.CRITICAL
            confidence >= 0.8f && decibels >= 90.0 -> ThreatLevel.HIGH
            confidence >= 0.7f && decibels >= 85.0 -> ThreatLevel.MEDIUM
            else -> ThreatLevel.LOW
        }
    }

    /**
     * Save audio event to database
     */
    private fun saveAudioEvent(audioEvent: AudioEvent) {
        try {
            serviceScope.launch {
                // Save to local database and Firebase
                // Implementation depends on your data layer
                Timber.d("$TAG: Audio event saved: $audioEvent")
            }
        } catch (e: Exception) {
            Timber.e(e, "$TAG: Error saving audio event")
        }
    }

    /**
     * Update audio meter UI
     */
    private fun updateAudioMeter(decibels: Double) {
        try {
            // Broadcast intent for UI update
            val intent = Intent("com.streetsentinel.AUDIO_UPDATE").apply {
                putExtra("decibels", decibels)
                putExtra("timestamp", System.currentTimeMillis())
            }
            sendBroadcast(intent)
        } catch (e: Exception) {
            Timber.e(e, "$TAG: Error updating audio meter")
        }
    }
}
