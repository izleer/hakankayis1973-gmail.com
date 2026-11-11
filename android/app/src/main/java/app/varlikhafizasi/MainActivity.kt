package app.varlikhafizasi

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.lifecycle.viewmodel.compose.viewModel
import app.varlikhafizasi.data.AppLanguage
import app.varlikhafizasi.reminders.ReminderNotifier
import app.varlikhafizasi.ui.VhViewModel
import app.varlikhafizasi.ui.navigation.VhRoot
import app.varlikhafizasi.ui.theme.Paper
import app.varlikhafizasi.ui.theme.VhTheme

class MainActivity : ComponentActivity() {
    /** Hatırlatma bildiriminden gelen varlık bağlantısı. */
    private var pendingAssetId by mutableStateOf<String?>(null)

    override fun attachBaseContext(newBase: Context) {
        super.attachBaseContext(AppLanguage.wrap(newBase))
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        pendingAssetId = intent?.getStringExtra(ReminderNotifier.EXTRA_ASSET_ID)
        requestNotificationPermission()

        setContent {
            VhTheme {
                val vm: VhViewModel = viewModel(
                    factory = VhViewModel.factory(AppGraph.repository, applicationContext),
                )
                Surface(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(Paper),
                    color = Paper,
                ) {
                    VhRoot(
                        vm = vm,
                        pendingAssetId = pendingAssetId,
                        onPendingAssetConsumed = { pendingAssetId = null },
                    )
                }
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        intent.getStringExtra(ReminderNotifier.EXTRA_ASSET_ID)?.let { pendingAssetId = it }
    }

    private fun requestNotificationPermission() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return
        val granted = ContextCompat.checkSelfPermission(
            this,
            Manifest.permission.POST_NOTIFICATIONS,
        ) == PackageManager.PERMISSION_GRANTED
        if (!granted) {
            ActivityCompat.requestPermissions(
                this,
                arrayOf(Manifest.permission.POST_NOTIFICATIONS),
                REQUEST_NOTIFICATIONS,
            )
        }
    }

    private companion object {
        const val REQUEST_NOTIFICATIONS = 1001
    }
}
