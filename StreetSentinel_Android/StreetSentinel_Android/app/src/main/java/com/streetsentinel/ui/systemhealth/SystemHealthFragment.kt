package com.streetsentinel.ui.systemhealth

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.fragment.app.Fragment
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class SystemHealthFragment : Fragment() {
    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?
    ): View {
        return TextView(requireContext()).apply {
            text = "System Health Dashboard (Coming Soon)"
            gravity = android.view.Gravity.CENTER
        }
    }
}
