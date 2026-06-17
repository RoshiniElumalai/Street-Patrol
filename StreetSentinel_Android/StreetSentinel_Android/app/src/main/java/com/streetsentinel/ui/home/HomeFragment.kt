package com.streetsentinel.ui.home

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.navigation.fragment.findNavController
import com.streetsentinel.R
import com.streetsentinel.databinding.FragmentHomeBinding
import com.streetsentinel.services.StreetSentinelForegroundService
import dagger.hilt.android.AndroidEntryPoint
import timber.log.Timber

@AndroidEntryPoint
class HomeFragment : Fragment() {

    private var _binding: FragmentHomeBinding? = null
    private val binding get() = _binding!!
    private val viewModel: HomeViewModel by viewModels()

    private val locationReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            val lat = intent?.getDoubleExtra("latitude", 0.0) ?: return
            val lng = intent.getDoubleExtra("longitude", 0.0)
            updateLocationUI(lat, lng)
        }
    }

    private val audioReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            val db = intent?.getDoubleExtra("decibels", 0.0) ?: return
            updateAudioMeter(db)
        }
    }

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?
    ): View {
        _binding = FragmentHomeBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        setupUI()
        observeViewModel()
    }

    override fun onResume() {
        super.onResume()
        requireContext().registerReceiver(
            locationReceiver,
            IntentFilter("com.streetsentinel.LOCATION_UPDATE")
        )
        requireContext().registerReceiver(
            audioReceiver,
            IntentFilter("com.streetsentinel.AUDIO_UPDATE")
        )
        viewModel.refreshSystemHealth()
    }

    override fun onPause() {
        super.onPause()
        try {
            requireContext().unregisterReceiver(locationReceiver)
            requireContext().unregisterReceiver(audioReceiver)
        } catch (e: Exception) {
            Timber.e(e, "Error unregistering receivers")
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }

    private fun setupUI() {
        with(binding) {
            // SOS Button
            btnSos.setOnClickListener {
                findNavController().navigate(R.id.action_home_to_sos)
            }

            // SafeWalk Button
            btnSafeWalk.setOnClickListener {
                findNavController().navigate(R.id.action_home_to_safeWalk)
            }

            // Toggle protection
            switchProtection.setOnCheckedChangeListener { _, isChecked ->
                viewModel.toggleProtection(isChecked)
                if (isChecked) {
                    StreetSentinelForegroundService.start(requireContext())
                    tvProtectionStatus.text = "Protection: ACTIVE"
                    tvProtectionStatus.setTextColor(
                        requireContext().getColor(R.color.status_active)
                    )
                } else {
                    StreetSentinelForegroundService.stop(requireContext())
                    tvProtectionStatus.text = "Protection: INACTIVE"
                    tvProtectionStatus.setTextColor(
                        requireContext().getColor(R.color.status_inactive)
                    )
                }
            }

            // Nearby Safety button
            btnNearbySafety.setOnClickListener {
                findNavController().navigate(R.id.action_home_to_nearbySafety)
            }

            // Evidence Vault
            btnEvidenceVault.setOnClickListener {
                findNavController().navigate(R.id.action_home_to_evidenceVault)
            }

            // System Health
            btnSystemHealth.setOnClickListener {
                findNavController().navigate(R.id.action_home_to_systemHealth)
            }

            // Fake Call
            btnFakeCall.setOnClickListener {
                viewModel.triggerFakeCall()
            }
        }
    }

    private fun observeViewModel() {
        viewModel.systemHealth.observe(viewLifecycleOwner) { health ->
            with(binding) {
                tvMicStatus.text = "Microphone: ${health.microphoneStatus}"
                tvGpsStatus.text = "GPS: ${health.gpsStatus}"
                tvInternetStatus.text = "Internet: ${health.internetStatus}"
                tvNotificationStatus.text = "Notifications: ${health.notificationStatus}"
                tvDatabaseStatus.text = "Database: ${health.databaseStatus}"
                tvProtectionBadge.text = health.protectionStatus
            }
        }

        viewModel.isProtectionEnabled.observe(viewLifecycleOwner) { enabled ->
            binding.switchProtection.isChecked = enabled
        }

        viewModel.lastAlertTime.observe(viewLifecycleOwner) { time ->
            binding.tvLastAlert.text = "Last Alert: $time"
        }

        viewModel.alertCount.observe(viewLifecycleOwner) { count ->
            binding.tvAlertCount.text = count.toString()
        }
    }

    private fun updateLocationUI(lat: Double, lng: Double) {
        binding.tvCurrentLocation.text =
            "Location: %.4f, %.4f".format(lat, lng)
    }

    private fun updateAudioMeter(decibels: Double) {
        val progress = (decibels / 120.0 * 100).toInt().coerceIn(0, 100)
        binding.audioLevelBar.progress = progress
        binding.tvAudioLevel.text = "%.0f dB".format(decibels)

        val color = when {
            decibels >= 85 -> requireContext().getColor(R.color.threat_high)
            decibels >= 70 -> requireContext().getColor(R.color.threat_medium)
            else -> requireContext().getColor(R.color.status_active)
        }
        binding.audioLevelBar.progressTintList =
            android.content.res.ColorStateList.valueOf(color)
    }
}
