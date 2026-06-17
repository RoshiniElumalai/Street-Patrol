package com.streetsentinel.ui.fakecall

import android.os.Bundle
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class FakeCallActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Simple layout to simulate a fake incoming call screen
        val layout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = android.view.Gravity.CENTER
            setBackgroundColor(android.graphics.Color.DKGRAY)
            setPadding(32, 32, 32, 32)
        }

        val callerTextView = TextView(this).apply {
            text = "Incoming Call\nUnknown Caller"
            textSize = 24f
            setTextColor(android.graphics.Color.WHITE)
            gravity = android.view.Gravity.CENTER
        }
        layout.addView(callerTextView)

        val declineButton = Button(this).apply {
            text = "Decline / Hang Up"
            setOnClickListener { finish() }
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                topMargin = 50
            }
        }
        layout.addView(declineButton)

        setContentView(layout)
    }
}
