package app.varlikhafizasi.ui.components

import android.annotation.SuppressLint
import android.os.Handler
import android.os.Looper
import android.webkit.JavascriptInterface
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.MyLocation
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import app.varlikhafizasi.BuildConfig
import app.varlikhafizasi.R
import app.varlikhafizasi.ui.screens.PickedLocation
import app.varlikhafizasi.ui.screens.fetchCurrentLocation
import app.varlikhafizasi.ui.screens.hasLocationPermission
import app.varlikhafizasi.ui.screens.locationPermissions
import app.varlikhafizasi.ui.theme.Danger
import app.varlikhafizasi.ui.theme.Forest
import app.varlikhafizasi.ui.theme.Line
import app.varlikhafizasi.ui.theme.Muted
import app.varlikhafizasi.ui.theme.Paper
import app.varlikhafizasi.ui.theme.PaperDeep
import kotlinx.coroutines.launch

private const val DEFAULT_LATITUDE = 41.0369
private const val DEFAULT_LONGITUDE = 28.9857

/**
 * Harita üzerinden konum seçme penceresi. OSM/Leaflet tabanlı harita cihazda
 * gömülü gelir; açılışta mevcut konum alınır, kullanıcı iğneyi sürükleyerek
 * veya haritaya dokunarak noktayı değiştirebilir.
 */
@Composable
fun LocationMapDialog(
    initialLatitude: Double?,
    initialLongitude: Double?,
    onDismiss: () -> Unit,
    onConfirm: (PickedLocation) -> Unit,
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val mainHandler = remember { Handler(Looper.getMainLooper()) }

    var pickedLat by remember {
        mutableStateOf(initialLatitude ?: DEFAULT_LATITUDE)
    }
    var pickedLng by remember {
        mutableStateOf(initialLongitude ?: DEFAULT_LONGITUDE)
    }
    var locating by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    // Kullanıcı iğneyi oynattıysa geç gelen GPS sonucu seçimi ezmemeli.
    var userMovedPin by remember { mutableStateOf(false) }
    val webView = remember { arrayOfNulls<WebView>(1) }
    val latest = remember {
        arrayOfNulls<PickedLocation>(1).also {
            it[0] = PickedLocation(pickedLat, pickedLng, null)
        }
    }

    val unavailable = stringResource(R.string.assets_location_unavailable)
    val denied = stringResource(R.string.assets_location_permission_denied)

    fun recenter(location: PickedLocation) {
        pickedLat = location.latitude
        pickedLng = location.longitude
        latest[0] = location
        webView[0]?.evaluateJavascript(
            "window.setMarker(${location.latitude},${location.longitude},16)",
            null,
        )
    }

    fun startFetch(respectUserPick: Boolean) {
        if (locating) return
        error = null
        scope.launch {
            locating = true
            try {
                val location = fetchCurrentLocation(context)
                // Açılışta otomatik denemede kullanıcı iğneyi oynattıysa dokunma.
                if (!respectUserPick || !userMovedPin) recenter(location)
            } catch (_: Exception) {
                error = unavailable
            } finally {
                locating = false
            }
        }
    }

    var respectPickAfterGrant by remember { mutableStateOf(true) }
    val permissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions(),
    ) { grants ->
        if (grants.values.any { it }) {
            startFetch(respectUserPick = respectPickAfterGrant)
        } else {
            error = denied
        }
    }

    fun locate(respectUserPick: Boolean) {
        error = null
        if (hasLocationPermission(context)) {
            startFetch(respectUserPick)
        } else {
            respectPickAfterGrant = respectUserPick
            permissionLauncher.launch(locationPermissions)
        }
    }

    // Konum seçilmemişse açılışta mevcut konumu dene.
    LaunchedEffect(Unit) {
        if (initialLatitude == null || initialLongitude == null) locate(respectUserPick = true)
    }

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false),
    ) {
        Surface(
            color = Paper,
            shape = RoundedCornerShape(22.dp),
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 14.dp),
        ) {
            Column(Modifier.padding(16.dp)) {
                Text(
                    stringResource(R.string.add_entry_location_dialog_title),
                    style = MaterialTheme.typography.titleLarge,
                    color = Forest,
                )
                Spacer(Modifier.height(4.dp))
                Text(
                    stringResource(R.string.add_entry_location_dialog_hint),
                    style = MaterialTheme.typography.bodySmall,
                    color = Muted,
                )
                Spacer(Modifier.height(12.dp))

                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(400.dp)
                        .clip(RoundedCornerShape(16.dp))
                        .background(PaperDeep),
                ) {
                    AndroidView(
                        factory = { ctx ->
                            if (BuildConfig.DEBUG) {
                                WebView.setWebContentsDebuggingEnabled(true)
                            }
                            @SuppressLint("SetJavaScriptEnabled")
                            val view = WebView(ctx).apply {
                                settings.javaScriptEnabled = true
                                settings.domStorageEnabled = true
                                settings.allowFileAccess = true
                                settings.setSupportZoom(false)
                                setBackgroundColor(0xFFEFECE3.toInt())
                                webViewClient = object : WebViewClient() {
                                    override fun onPageFinished(view: WebView?, url: String?) {
                                        super.onPageFinished(view, url)
                                        // Sayfa hazır olunca iğneyi güncel noktaya taşı.
                                        latest[0]?.let { location ->
                                            view?.evaluateJavascript(
                                                "window.setMarker(${location.latitude},${location.longitude},16)",
                                                null,
                                            )
                                        }
                                    }
                                }
                                addJavascriptInterface(
                                    MapBridge { lat, lng ->
                                        mainHandler.post {
                                            userMovedPin = true
                                            pickedLat = lat
                                            pickedLng = lng
                                            latest[0] = PickedLocation(lat, lng, null)
                                        }
                                    },
                                    "AndroidMap",
                                )
                                loadUrl(
                                    "file:///android_asset/map_picker.html" +
                                        "?lat=$pickedLat&lng=$pickedLng&z=16",
                                )
                            }
                            webView[0] = view
                            view
                        },
                        modifier = Modifier.fillMaxSize(),
                    )

                    if (locating) {
                        Surface(
                            color = Paper.copy(alpha = 0.88f),
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier.align(Alignment.Center),
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp),
                            ) {
                                CircularProgressIndicator(
                                    strokeWidth = 2.dp,
                                    color = Forest,
                                    modifier = Modifier.size(16.dp),
                                )
                                Spacer(Modifier.size(8.dp))
                                Text(
                                    stringResource(R.string.add_entry_location_locating),
                                    style = MaterialTheme.typography.bodySmall,
                                    color = Forest,
                                )
                            }
                        }
                    }
                }

                if (error != null) {
                    Spacer(Modifier.height(8.dp))
                    Text(error ?: "", style = MaterialTheme.typography.bodySmall, color = Danger)
                }

                Spacer(Modifier.height(10.dp))
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    OutlinedButton(
                        onClick = { locate(respectUserPick = false) },
                        enabled = !locating,
                        shape = RoundedCornerShape(12.dp),
                        border = BorderStroke(1.dp, Line),
                    ) {
                        Icon(
                            Icons.Outlined.MyLocation,
                            contentDescription = null,
                            tint = Forest,
                            modifier = Modifier.size(16.dp),
                        )
                        Spacer(Modifier.size(6.dp))
                        Text(
                            stringResource(R.string.add_entry_location_current),
                            style = MaterialTheme.typography.labelMedium,
                            color = Forest,
                        )
                    }
                    Spacer(Modifier.weight(1f))
                    TextButton(onClick = onDismiss) {
                        Text(
                            stringResource(R.string.add_entry_location_cancel),
                            style = MaterialTheme.typography.labelMedium,
                            color = Muted,
                        )
                    }
                }

                Button(
                    onClick = { onConfirm(PickedLocation(pickedLat, pickedLng, null)) },
                    colors = ButtonDefaults.buttonColors(
                        containerColor = Forest,
                        contentColor = Paper,
                    ),
                    shape = RoundedCornerShape(50),
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(48.dp),
                ) {
                    Text(
                        stringResource(R.string.add_entry_location_confirm),
                        style = MaterialTheme.typography.labelLarge,
                    )
                }
            }
        }
    }

    DisposableEffect(Unit) {
        onDispose {
            webView[0]?.removeJavascriptInterface("AndroidMap")
            webView[0]?.destroy()
            webView[0] = null
        }
    }
}

private class MapBridge(private val onMove: (Double, Double) -> Unit) {
    @JavascriptInterface
    fun report(latitude: Double, longitude: Double) {
        onMove(latitude, longitude)
    }
}
