package com.streetsentinel.ui

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.view.View
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.lifecycle.ViewModelProvider
import androidx.navigation.NavController
import androidx.navigation.fragment.NavHostFragment
import androidx.navigation.ui.setupWithNavController
import com.google.android.material.bottomnavigation.BottomNavigationView
import com.google.firebase.auth.FirebaseAuth
import com.streetsentinel.R
import com.streetsentinel.databinding.ActivityMainBinding
import com.streetsentinel.services.StreetSentinelForegroundService
import com.streetsentinel.ui.auth.LoginActivity
import com.streetsentinel.ui.viewmodels.MainViewModel
import com.streetsentinel.utils.PreferencesManager
import dagger.hilt.android.AndroidEntryPoint
import timber.log.Timber
import javax.inject.Inject

/**
 * Main Activity
 *
 * Hosts bottom navigation with fragments:
 * - Home (Dashboard)
 * - SafeWalk
 * - SOS
 * - Alerts
 * - Profile
 */
@AndroidEntryPoint
class MainActivity : AppCompatActivity() {

    companion object {
        private const val TAG = "MainActivity"
    }

    private lateinit var binding: ActivityMainBinding
    private lateinit var navController: NavController
    private lateinit var viewModel: MainViewModel

    @Inject
    lateinit var preferencesManager: PreferencesManager

    private val requiredPermissions = buildList {
        add(Manifest.permission.ACCESS_FINE_LOCATION)
        add(Manifest.permission.ACCESS_COARSE_LOCATION)
        add(Manifest.permission.RECORD_AUDIO)
        add(Manifest.permission.SEND_SMS)
        add(Manifest.permission.READ_CONTACTS)
        add(Manifest.permission.CALL_PHONE)
        add(Manifest.permission.VIBRATE)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            add(Manifest.permission.POST_NOTIFICATIONS)
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            add(Manifest.permission.ACCESS_BACKGROUND_LOCATION)
        }
    }.toTypedArray()

    private val permissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        val allGranted = permissions.values.all { it }
        if (allGranted) {
            Timber.d("$TAG: All permissions granted")
            preferencesManager.setPermissionsGranted(true)
            startProtectionService()
        } else {
            val denied = permissions.filter { !it.value }.keys.joinToString(", ")
            Timber.w("$TAG: Permissions denied: $denied")
            Toast.makeText(
                this,
                "Some permissions denied. Features may be limited.",
                Toast.LENGTH_LONG
            ).show()
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Check auth
        if (!isUserLoggedIn()) {
            startActivity(Intent(this, LoginActivity::class.java))
            finish()
            return
        }

        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        viewModel = ViewModelProvider(this)[MainViewModel::class.java]

        setupNavigation()
        setupObservers()
        requestPermissionsIfNeeded()

        // Handle intent from notification
        handleIncomingIntent(intent)
    }

    override fun onNewIntent(intent: Intent?) {
        super.onNewIntent(intent)
        intent?.let { handleIncomingIntent(it) }
    }

    private fun isUserLoggedIn(): Boolean {
        return FirebaseAuth.getInstance().currentUser != null
    }

    private fun setupNavigation() {
        val navHostFragment = supportFragmentManager
            .findFragmentById(R.id.nav_host_fragment) as NavHostFragment
        navController = navHostFragment.navController

        val bottomNav = binding.bottomNavigation
        bottomNav.setupWithNavController(navController)

        // Show/hide bottom nav based on destination
        navController.addOnDestinationChangedListener { _, destination, _ ->
            when (destination.id) {
                R.id.homeFragment,
                R.id.safeWalkFragment,
                R.id.sosFragment,
                R.id.alertsFragment,
                R.id.profileFragment -> {
                    binding.bottomNavigation.visibility = View.VISIBLE
                }
                else -> {
                    binding.bottomNavigation.visibility = View.GONE
                }
            }
        }

        Timber.d("$TAG: Navigation setup complete")
    }

    private fun setupObservers() {
        viewModel.navigationEvent.observe(this) { destination ->
            navController.navigate(destination)
        }

        viewModel.toastMessage.observe(this) { message ->
            Toast.makeText(this, message, Toast.LENGTH_SHORT).show()
        }
    }

    private fun requestPermissionsIfNeeded() {
        val notGranted = requiredPermissions.filter {
            ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED
        }

        if (notGranted.isNotEmpty()) {
            Timber.d("$TAG: Requesting ${notGranted.size} permissions")
            permissionLauncher.launch(notGranted.toTypedArray())
        } else {
            Timber.d("$TAG: All permissions already granted")
            preferencesManager.setPermissionsGranted(true)
            startProtectionService()
        }
    }

    private fun startProtectionService() {
        try {
            if (preferencesManager.isProtectionEnabled()) {
                StreetSentinelForegroundService.start(this)
                Timber.d("$TAG: Protection service started")
            }
        } catch (e: Exception) {
            Timber.e(e, "$TAG: Error starting protection service")
        }
    }

    private fun handleIncomingIntent(intent: Intent) {
        when {
            intent.getBooleanExtra("openCheckin", false) -> {
                navController.navigate(R.id.safeWalkFragment)
            }
            intent.getBooleanExtra("openSOS", false) -> {
                navController.navigate(R.id.sosFragment)
            }
            intent.getBooleanExtra("openAlerts", false) -> {
                navController.navigate(R.id.alertsFragment)
            }
        }
    }

    override fun onSupportNavigateUp(): Boolean {
        return navController.navigateUp() || super.onSupportNavigateUp()
    }
}
