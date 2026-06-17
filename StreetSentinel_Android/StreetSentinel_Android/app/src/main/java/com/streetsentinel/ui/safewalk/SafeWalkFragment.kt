package com.streetsentinel.ui.safewalk

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Bundle
import android.os.CountDownTimer
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import com.google.android.gms.maps.CameraUpdateFactory
import com.google.android.gms.maps.GoogleMap
import com.google.android.gms.maps.OnMapReadyCallback
import com.google.android.gms.maps.SupportMapFragment
import com.google.android.gms.maps.model.LatLng
import com.google.android.gms.maps.model.MarkerOptions
import com.google.android.gms.maps.model.PolylineOptions
import com.streetsentinel.R
import com.streetsentinel.databinding.FragmentSafeWalkBinding
import com.streetsentinel.data.models.SafeWalkSession
import dagger.hilt.android.AndroidEntryPoint
import timber.log.Timber
import java.util.concurrent.TimeUnit

@AndroidEntryPoint
class SafeWalkFragment : Fragment(), OnMapReadyCallback {

    private var _binding: FragmentSafeWalkBinding? = null
    private val binding get() = _binding!!
    private val viewModel: SafeWalkViewModel by viewModels()

    private var googleMap: GoogleMap? = null
    private var checkInTimer: CountDownTimer? = null
    private var routePoints = mutableListOf<LatLng>()

    private val arrivalReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            Timber.d("SafeWalkFragment: Arrival broadcast received")
            handleArrival()
        }
    }

    private val locationReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            val lat = intent?.getDoubleExtra("latitude", 0.0) ?: return
            val lng = intent.getDoubleExtra("longitude", 0.0)
            updateMapLocation(lat, lng)
        }
    }

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?
    ): View {
        _binding = FragmentSafeWalkBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        setupMap()
        setupUI()
        observeViewModel()
    }

    override fun onResume() {
        super.onResume()
        requireContext().registerReceiver(
            arrivalReceiver,
            IntentFilter("com.streetsentinel.SAFEWALK_ARRIVAL")
        )
        requireContext().registerReceiver(
            locationReceiver,
            IntentFilter("com.streetsentinel.LOCATION_UPDATE")
        )
    }

    override fun onPause() {
        super.onPause()
        try {
            requireContext().unregisterReceiver(arrivalReceiver)
            requireContext().unregisterReceiver(locationReceiver)
        } catch (e: Exception) { }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        checkInTimer?.cancel()
        _binding = null
    }

    private fun setupMap() {
        val mapFragment = childFragmentManager.findFragmentById(R.id.mapView) as SupportMapFragment
        mapFragment.getMapAsync(this)
    }

    override fun onMapReady(map: GoogleMap) {
        googleMap = map
        try {
            map.isMyLocationEnabled = true
            map.uiSettings.isMyLocationButtonEnabled = true
            map.uiSettings.isZoomControlsEnabled = true
        } catch (e: SecurityException) {
            Timber.e(e, "Location permission not granted for map")
        }
    }

    private fun setupUI() {
        with(binding) {
            btnStartWalk.setOnClickListener {
                val dest = etDestination.text.toString().trim()
                val minutes = etCheckInTime.text.toString().toIntOrNull() ?: 30
                if (dest.isNotEmpty()) {
                    viewModel.startSafeWalk(dest, minutes)
                } else {
                    Toast.makeText(requireContext(), "Enter destination", Toast.LENGTH_SHORT).show()
                }
            }

            btnEndWalk.setOnClickListener {
                viewModel.endSafeWalk()
            }

            btnCheckIn.setOnClickListener {
                viewModel.performCheckIn()
            }

            btnShareLocation.setOnClickListener {
                viewModel.shareCurrentLocation()
            }
        }
    }

    private fun observeViewModel() {
        viewModel.safeWalkSession.observe(viewLifecycleOwner) { session ->
            session?.let { updateSessionUI(it) }
        }

        viewModel.isWalkActive.observe(viewLifecycleOwner) { active ->
            with(binding) {
                btnStartWalk.visibility = if (active) View.GONE else View.VISIBLE
                layoutWalkInfo.visibility = if (active) View.VISIBLE else View.GONE
                layoutStartWalk.visibility = if (active) View.GONE else View.VISIBLE
            }
        }

        viewModel.distanceToDestination.observe(viewLifecycleOwner) { distance ->
            binding.tvDistance.text = "Distance: ${formatDistance(distance)}"
        }

        viewModel.eta.observe(viewLifecycleOwner) { eta ->
            binding.tvEta.text = "ETA: ${formatEta(eta)}"
        }

        viewModel.checkInRequired.observe(viewLifecycleOwner) { required ->
            if (required) showCheckInDialog()
        }
    }

    private fun updateSessionUI(session: SafeWalkSession) {
        with(binding) {
            tvDestination.text = "To: ${session.destinationName}"
            tvWalkStatus.text = "Status: ${session.status}"

            // Update check-in timer
            startCheckInCountdown(session.checkInTimeout)
        }
    }

    private fun startCheckInCountdown(durationMs: Long) {
        checkInTimer?.cancel()
        checkInTimer = object : CountDownTimer(durationMs, 1000) {
            override fun onTick(millisUntilFinished: Long) {
                val minutes = TimeUnit.MILLISECONDS.toMinutes(millisUntilFinished)
                val seconds = TimeUnit.MILLISECONDS.toSeconds(millisUntilFinished) % 60
                binding.tvCheckInTimer.text = "Check-in in: %02d:%02d".format(minutes, seconds)
            }

            override fun onFinish() {
                binding.tvCheckInTimer.text = "Check-in REQUIRED!"
                showCheckInDialog()
            }
        }.start()
    }

    private fun showCheckInDialog() {
        if (!isAdded) return
        AlertDialog.Builder(requireContext())
            .setTitle("Have you arrived safely?")
            .setMessage("Your check-in timer has expired. Are you safe?")
            .setPositiveButton("✓ I'M SAFE") { dialog, _ ->
                viewModel.performCheckIn()
                dialog.dismiss()
            }
            .setNegativeButton("🚨 SEND LOCATION") { dialog, _ ->
                viewModel.triggerEmergency()
                dialog.dismiss()
            }
            .setCancelable(false)
            .show()
    }

    private fun handleArrival() {
        if (!isAdded) return
        checkInTimer?.cancel()
        AlertDialog.Builder(requireContext())
            .setTitle("✓ Arrived!")
            .setMessage("You have arrived at your destination.")
            .setPositiveButton("Complete Walk") { dialog, _ ->
                viewModel.endSafeWalk()
                dialog.dismiss()
            }
            .show()
    }

    private fun updateMapLocation(lat: Double, lng: Double) {
        googleMap?.let { map ->
            val position = LatLng(lat, lng)
            routePoints.add(position)

            // Draw route
            if (routePoints.size >= 2) {
                map.addPolyline(
                    PolylineOptions()
                        .addAll(routePoints)
                        .color(requireContext().getColor(R.color.primary))
                        .width(8f)
                )
            }

            // Move camera to current location
            map.animateCamera(CameraUpdateFactory.newLatLngZoom(position, 16f))
        }
    }

    private fun formatDistance(meters: Float): String {
        return if (meters >= 1000) {
            "%.1f km".format(meters / 1000)
        } else {
            "${meters.toInt()} m"
        }
    }

    private fun formatEta(ms: Long): String {
        val minutes = TimeUnit.MILLISECONDS.toMinutes(ms)
        return if (minutes < 60) "$minutes min" else "${minutes / 60}h ${minutes % 60}m"
    }
}
