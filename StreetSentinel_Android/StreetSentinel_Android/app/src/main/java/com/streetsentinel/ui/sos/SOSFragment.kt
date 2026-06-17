package com.streetsentinel.ui.sos

import android.os.Bundle
import android.os.CountDownTimer
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import com.streetsentinel.databinding.FragmentSosBinding
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class SOSFragment : Fragment() {

    private var _binding: FragmentSosBinding? = null
    private val binding get() = _binding!!
    private val viewModel: SOSViewModel by viewModels()

    private var sosCountdown: CountDownTimer? = null
    private var isSosActive = false

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?
    ): View {
        _binding = FragmentSosBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        setupUI()
        observeViewModel()
    }

    override fun onDestroyView() {
        super.onDestroyView()
        sosCountdown?.cancel()
        _binding = null
    }

    private fun setupUI() {
        with(binding) {
            // Main SOS Button - hold to activate
            btnSOS.setOnLongClickListener {
                if (!isSosActive) activateSOS()
                true
            }

            btnSOS.setOnClickListener {
                if (isSosActive) {
                    cancelSOS()
                } else {
                    // Show hint
                    tvSosHint.text = "Hold button to activate SOS"
                    tvSosHint.visibility = View.VISIBLE
                }
            }

            // Cancel button
            btnCancelSos.setOnClickListener {
                cancelSOS()
            }

            // Share location
            btnShareLocationNow.setOnClickListener {
                viewModel.shareLocationImmediately()
            }

            // Call emergency services
            btnCallEmergency.setOnClickListener {
                viewModel.callEmergencyServices()
            }
        }
    }

    private fun observeViewModel() {
        viewModel.sosState.observe(viewLifecycleOwner) { state ->
            when (state) {
                SOSState.IDLE -> showIdleState()
                SOSState.COUNTING_DOWN -> showCountdownState()
                SOSState.ACTIVE -> showActiveState()
                SOSState.CANCELLED -> showIdleState()
                else -> showIdleState()
            }
        }

        viewModel.nearbyContacts.observe(viewLifecycleOwner) { contacts ->
            binding.tvContactsCount.text = "${contacts.size} contacts will be alerted"
        }
    }

    private fun activateSOS() {
        isSosActive = true
        viewModel.startSOSCountdown()
        showCountdownState()

        sosCountdown = object : CountDownTimer(10000, 1000) {
            override fun onTick(millisUntilFinished: Long) {
                val sec = millisUntilFinished / 1000
                binding.tvCountdown.text = sec.toString()
            }

            override fun onFinish() {
                viewModel.triggerSOS()
            }
        }.start()
    }

    private fun cancelSOS() {
        isSosActive = false
        sosCountdown?.cancel()
        viewModel.cancelSOS()
        showIdleState()
    }

    private fun showIdleState() {
        with(binding) {
            btnSOS.text = "SOS"
            btnSOS.setBackgroundColor(requireContext().getColor(com.streetsentinel.R.color.sos_red))
            tvCountdown.visibility = View.GONE
            btnCancelSos.visibility = View.GONE
            tvSosHint.text = "Hold to activate emergency SOS"
        }
    }

    private fun showCountdownState() {
        with(binding) {
            btnSOS.text = "CANCEL"
            btnSOS.setBackgroundColor(requireContext().getColor(com.streetsentinel.R.color.warning_orange))
            tvCountdown.visibility = View.VISIBLE
            btnCancelSos.visibility = View.VISIBLE
            tvSosHint.text = "Sending SOS in..."
        }
    }

    private fun showActiveState() {
        with(binding) {
            btnSOS.text = "SOS SENT"
            btnSOS.setBackgroundColor(requireContext().getColor(com.streetsentinel.R.color.threat_high))
            tvCountdown.visibility = View.GONE
            btnCancelSos.visibility = View.VISIBLE
            tvSosHint.text = "Emergency contacts alerted!"
        }
    }
}

enum class SOSState {
    IDLE, COUNTING_DOWN, ACTIVE, CANCELLED
}
