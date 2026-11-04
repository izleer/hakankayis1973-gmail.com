package app.varlikhafizasi

import android.content.Context
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import androidx.lifecycle.viewmodel.compose.viewModel
import app.varlikhafizasi.data.AppLanguage
import app.varlikhafizasi.ui.VhViewModel
import app.varlikhafizasi.ui.navigation.VhRoot
import app.varlikhafizasi.ui.theme.Paper
import app.varlikhafizasi.ui.theme.VhTheme

class MainActivity : ComponentActivity() {
    override fun attachBaseContext(newBase: Context) {
        super.attachBaseContext(AppLanguage.wrap(newBase))
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
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
                    VhRoot(vm)
                }
            }
        }
    }
}
