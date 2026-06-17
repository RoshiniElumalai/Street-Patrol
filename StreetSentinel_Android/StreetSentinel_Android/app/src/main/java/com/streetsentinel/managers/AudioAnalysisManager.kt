package com.streetsentinel.managers

import android.content.Context
import dagger.hilt.android.qualifiers.ApplicationContext
import org.tensorflow.lite.Interpreter
import org.tensorflow.lite.gpu.CompatibilityList
import timber.log.Timber
import java.io.FileInputStream
import java.nio.MappedByteBuffer
import java.nio.channels.FileChannel
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.math.sqrt

/**
 * Audio Analysis Manager
 *
 * Analyzes audio data to detect threats:
 * - Scream detection
 * - Help word detection
 * - Distress sounds
 * - Glass breaking
 *
 * Uses TensorFlow Lite ML model
 */
@Singleton
class AudioAnalysisManager @Inject constructor(
    @ApplicationContext private val context: Context
) {

    companion object {
        private const val TAG = "AudioAnalysisManager"

        // Threat detection keywords
        private val THREAT_KEYWORDS = mapOf(
            "scream" to 0.9f,
            "help" to 0.85f,
            "save" to 0.85f,
            "stop" to 0.8f,
            "no" to 0.7f,
            "please" to 0.7f
        )
    }

    data class ThreatAnalysis(
        val type: String,
        val confidence: Float,
        val decibels: Double
    )

    private var interpreter: Interpreter? = null

    init {
        try {
            loadModel()
        } catch (e: Exception) {
            Timber.e(e, "$TAG: Error loading ML model - will use fallback detection")
        }
    }

    /**
     * Analyze audio buffer for threats
     */
    fun analyzeThreat(
        audioBuffer: ShortArray,
        numRead: Int,
        decibels: Double
    ): ThreatAnalysis {
        return try {
            // Primary: ML-based detection (if model loaded)
            if (interpreter != null) {
                detectUsingModel(audioBuffer, numRead, decibels)
            } else {
                // Fallback: Rule-based detection
                detectUsingRules(audioBuffer, numRead, decibels)
            }
        } catch (e: Exception) {
            Timber.e(e, "$TAG: Error analyzing audio")
            ThreatAnalysis(
                type = "UNKNOWN",
                confidence = 0.0f,
                decibels = decibels
            )
        }
    }

    /**
     * ML-based threat detection using TensorFlow Lite
     */
    private fun detectUsingModel(
        audioBuffer: ShortArray,
        numRead: Int,
        decibels: Double
    ): ThreatAnalysis {
        try {
            // Prepare input: convert to float array and normalize
            val input = FloatArray(numRead) { i ->
                if (i < audioBuffer.size) {
                    (audioBuffer[i].toFloat() / 32768.0f).coerceIn(-1.0f, 1.0f)
                } else {
                    0.0f
                }
            }

            // ML model inference (adjust based on your actual model)
            // Output format depends on your trained model
            val output = Array(1) { FloatArray(5) } // Assuming 5 classes

            interpreter?.run(input, output)

            // Parse model output
            val screamConfidence = output[0][0]
            val helpConfidence = output[0][1]
            val distressConfidence = output[0][2]
            val glassConfidence = output[0][3]

            // Determine threat type and confidence
            return when {
                screamConfidence > 0.8f -> ThreatAnalysis("SCREAM", screamConfidence, decibels)
                helpConfidence > 0.75f -> ThreatAnalysis("HELP", helpConfidence, decibels)
                distressConfidence > 0.75f -> ThreatAnalysis("DISTRESS", distressConfidence, decibels)
                glassConfidence > 0.7f -> ThreatAnalysis("GLASS_BREAKING", glassConfidence, decibels)
                else -> ThreatAnalysis("NONE", 0.0f, decibels)
            }
        } catch (e: Exception) {
            Timber.e(e, "$TAG: Error in ML detection, falling back to rules")
            return detectUsingRules(audioBuffer, numRead, decibels)
        }
    }

    /**
     * Rule-based threat detection as fallback
     */
    private fun detectUsingRules(
        audioBuffer: ShortArray,
        numRead: Int,
        decibels: Double
    ): ThreatAnalysis {
        // Analyze frequency characteristics
        val frequencyProfile = analyzeFrequency(audioBuffer, numRead)

        // Detection rules
        val threatType: String
        val confidence: Float

        when {
            // Scream detection: high frequency + high energy
            frequencyProfile.highFreqEnergy > 0.7 && decibels >= 85.0 -> {
                threatType = "SCREAM"
                confidence = (frequencyProfile.highFreqEnergy * 0.5 + (decibels - 80.0) / 20.0 * 0.5).toFloat()
                    .coerceIn(0.0f, 1.0f)
            }

            // Distress detection: mid-high frequency + irregular pattern
            frequencyProfile.midFreqEnergy > 0.6 && frequencyProfile.variance > 0.3 && decibels >= 75.0 -> {
                threatType = "DISTRESS"
                confidence = (frequencyProfile.midFreqEnergy * 0.5 + frequencyProfile.variance * 0.5).toFloat()
                    .coerceIn(0.0f, 1.0f)
            }

            // Glass breaking: sharp transients + high frequency
            frequencyProfile.highFreqEnergy > 0.6 && frequencyProfile.sharpness > 0.7 -> {
                threatType = "GLASS_BREAKING"
                confidence = (frequencyProfile.highFreqEnergy * 0.5 + frequencyProfile.sharpness * 0.5).toFloat()
                    .coerceIn(0.0f, 1.0f)
            }

            // Generic threat based on loudness
            decibels >= 90.0 -> {
                threatType = "DISTRESS"
                confidence = ((decibels - 85.0) / 15.0).toFloat().coerceIn(0.0f, 1.0f)
            }

            else -> {
                threatType = "NONE"
                confidence = 0.0f
            }
        }

        return ThreatAnalysis(threatType, confidence, decibels)
    }

    /**
     * Analyze frequency characteristics of audio
     */
    private fun analyzeFrequency(audioBuffer: ShortArray, numRead: Int): FrequencyProfile {
        // Simple frequency analysis using energy in different bands
        val bandSize = numRead / 3

        var lowEnergy = 0.0
        var midEnergy = 0.0
        var highEnergy = 0.0

        for (i in 0 until numRead) {
            val sampleEnergy = (audioBuffer[i].toDouble() / 32768.0) * (audioBuffer[i].toDouble() / 32768.0)
            when {
                i < bandSize -> lowEnergy += sampleEnergy
                i < bandSize * 2 -> midEnergy += sampleEnergy
                else -> highEnergy += sampleEnergy
            }
        }

        val totalEnergy = lowEnergy + midEnergy + highEnergy
        val lowFreqEnergy = if (totalEnergy > 0) lowEnergy / totalEnergy else 0.0
        val midFreqEnergy = if (totalEnergy > 0) midEnergy / totalEnergy else 0.0
        val highFreqEnergy = if (totalEnergy > 0) highEnergy / totalEnergy else 0.0

        // Calculate variance (indicates irregular pattern)
        var variance = 0.0
        for (i in 0 until numRead) {
            val diff = audioBuffer[i] - (audioBuffer.getOrNull(i - 1)?.toInt() ?: 0)
            variance += (diff * diff).toDouble()
        }
        variance = sqrt(variance / numRead)

        // Calculate sharpness (sudden changes indicate transients)
        var sharpness = 0.0
        for (i in 1 until numRead) {
            val change = Math.abs(audioBuffer[i] - audioBuffer[i - 1]).toDouble()
            if (change > 5000) sharpness++
        }
        sharpness = sharpness / numRead

        return FrequencyProfile(
            lowFreqEnergy = lowFreqEnergy,
            midFreqEnergy = midFreqEnergy,
            highFreqEnergy = highFreqEnergy,
            variance = variance,
            sharpness = sharpness
        )
    }

    /**
     * Load TensorFlow Lite model
     */
    private fun loadModel() {
        try {
            // Load model from assets
            val assetManager = context.assets
            val modelBuffer = loadModelFile(assetManager, "threat_detection_model.tflite")

            // Create interpreter
            val options = Interpreter.Options()
            
            // Enable GPU acceleration if available
            if (CompatibilityList().isDelegateSupportedOnThisDevice) {
                options.addDelegate(org.tensorflow.lite.gpu.GpuDelegate())
                Timber.d("$TAG: GPU acceleration enabled")
            }

            interpreter = Interpreter(modelBuffer, options)
            Timber.d("$TAG: TensorFlow Lite model loaded successfully")
        } catch (e: Exception) {
            Timber.e(e, "$TAG: Failed to load TensorFlow Lite model")
            // Model loading failed - will use fallback rules
        }
    }

    /**
     * Load model file from assets
     */
    private fun loadModelFile(assetManager: android.content.res.AssetManager, filename: String): MappedByteBuffer {
        val fileDescriptor = assetManager.openFd(filename)
        val inputStream = FileInputStream(fileDescriptor.fileDescriptor)
        val fileChannel = inputStream.channel
        val startOffset = fileDescriptor.startOffset
        val declaredLength = fileDescriptor.declaredLength
        return fileChannel.map(FileChannel.MapMode.READ_ONLY, startOffset, declaredLength)
    }

    /**
     * Frequency profile data class
     */
    data class FrequencyProfile(
        val lowFreqEnergy: Double,
        val midFreqEnergy: Double,
        val highFreqEnergy: Double,
        val variance: Double,
        val sharpness: Double
    )

    protected fun finalize() {
        interpreter?.close()
    }
}
