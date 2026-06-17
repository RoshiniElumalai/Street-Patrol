package com.streetsentinel.ui.alerts

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.streetsentinel.data.models.Alert
import com.streetsentinel.data.models.ThreatLevel
import com.streetsentinel.data.repository.AlertRepository
import com.streetsentinel.databinding.FragmentAlertsBinding
import com.streetsentinel.databinding.ItemAlertBinding
import com.streetsentinel.utils.PreferencesManager
import dagger.hilt.android.AndroidEntryPoint
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import timber.log.Timber
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import javax.inject.Inject

// ==================== Fragment ====================

@AndroidEntryPoint
class AlertsFragment : Fragment() {

    private var _binding: FragmentAlertsBinding? = null
    private val binding get() = _binding!!
    private val viewModel: AlertsViewModel by viewModels()
    private lateinit var adapter: AlertsAdapter

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?
    ): View {
        _binding = FragmentAlertsBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        setupRecyclerView()
        observeViewModel()

        binding.btnClearAlerts.setOnClickListener {
            viewModel.clearAllAlerts()
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }

    private fun setupRecyclerView() {
        adapter = AlertsAdapter()
        binding.rvAlerts.layoutManager = LinearLayoutManager(requireContext())
        binding.rvAlerts.adapter = adapter
    }

    private fun observeViewModel() {
        viewModel.alerts.observe(viewLifecycleOwner) { alerts ->
            adapter.submitList(alerts)
            binding.tvEmptyAlerts.visibility = if (alerts.isEmpty()) View.VISIBLE else View.GONE
            binding.tvAlertCount.text = "${alerts.size} alerts"
        }
    }
}

// ==================== ViewModel ====================

@HiltViewModel
class AlertsViewModel @Inject constructor(
    private val alertRepository: AlertRepository,
    private val preferencesManager: PreferencesManager
) : ViewModel() {

    private val _alerts = MutableLiveData<List<Alert>>(emptyList())
    val alerts: LiveData<List<Alert>> = _alerts

    init {
        loadAlerts()
    }

    private fun loadAlerts() {
        viewModelScope.launch {
            try {
                alertRepository.getAlerts(preferencesManager.getUserId())
                    .collect { alerts ->
                        _alerts.postValue(alerts)
                    }
            } catch (e: Exception) {
                Timber.e(e, "AlertsViewModel: Error loading alerts")
            }
        }
    }

    fun clearAllAlerts() {
        viewModelScope.launch {
            try {
                alertRepository.clearAlerts(preferencesManager.getUserId())
            } catch (e: Exception) {
                Timber.e(e, "AlertsViewModel: Error clearing alerts")
            }
        }
    }
}

// ==================== Adapter ====================

class AlertsAdapter : ListAdapter<Alert, AlertsAdapter.AlertViewHolder>(AlertDiffCallback()) {

    private val sdf = SimpleDateFormat("dd MMM yyyy, HH:mm", Locale.getDefault())

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): AlertViewHolder {
        val binding = ItemAlertBinding.inflate(
            LayoutInflater.from(parent.context), parent, false
        )
        return AlertViewHolder(binding)
    }

    override fun onBindViewHolder(holder: AlertViewHolder, position: Int) {
        holder.bind(getItem(position))
    }

    inner class AlertViewHolder(private val binding: ItemAlertBinding) :
        RecyclerView.ViewHolder(binding.root) {

        fun bind(alert: Alert) {
            with(binding) {
                tvAlertType.text = formatThreatType(alert.threatType)
                tvAlertTime.text = sdf.format(Date(alert.timestamp))
                tvAlertLevel.text = alert.threatLevel.name
                tvAlertStatus.text = alert.status
                tvAlertLocation.text = "%.4f, %.4f".format(alert.latitude, alert.longitude)
                tvAlertConfidence.text = "${(alert.confidence * 100).toInt()}% confidence"

                // Color badge based on threat level
                val color = when (alert.threatLevel) {
                    ThreatLevel.CRITICAL -> root.context.getColor(com.streetsentinel.R.color.threat_critical)
                    ThreatLevel.HIGH -> root.context.getColor(com.streetsentinel.R.color.threat_high)
                    ThreatLevel.MEDIUM -> root.context.getColor(com.streetsentinel.R.color.threat_medium)
                    ThreatLevel.LOW -> root.context.getColor(com.streetsentinel.R.color.threat_low)
                }
                tvAlertLevel.setTextColor(color)

                // Delivery status indicators
                ivEmailSent.visibility = if (alert.emailSent) View.VISIBLE else View.GONE
                ivSmsSent.visibility = if (alert.contactsNotified > 0) View.VISIBLE else View.GONE
                ivWhatsappSent.visibility = if (alert.whatsappSent) View.VISIBLE else View.GONE
            }
        }

        private fun formatThreatType(type: String): String {
            return when (type.uppercase()) {
                "SCREAM" -> "🔊 Scream Detected"
                "HELP" -> "🗣 Help Detected"
                "DISTRESS" -> "😰 Distress Sound"
                "GLASS_BREAKING" -> "💔 Glass Breaking"
                "MANUAL_SOS" -> "🆘 Manual SOS"
                "SAFEWALK_NO_CHECKIN" -> "🚶 SafeWalk No Check-in"
                else -> type
            }
        }
    }

    class AlertDiffCallback : DiffUtil.ItemCallback<Alert>() {
        override fun areItemsTheSame(oldItem: Alert, newItem: Alert) =
            oldItem.alertId == newItem.alertId
        override fun areContentsTheSame(oldItem: Alert, newItem: Alert) =
            oldItem == newItem
    }
}
