package app.varlikhafizasi.ui.components

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.MyLocation
import androidx.compose.material.icons.outlined.Place
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import app.varlikhafizasi.R
import app.varlikhafizasi.ui.screens.PickedLocation
import app.varlikhafizasi.ui.screens.fetchCurrentLocation
import app.varlikhafizasi.ui.screens.formatCoordinates
import app.varlikhafizasi.ui.screens.hasLocationPermission
import app.varlikhafizasi.ui.screens.locationPermissions
import app.varlikhafizasi.ui.screens.openInMaps
import app.varlikhafizasi.ui.theme.Danger
import app.varlikhafizasi.ui.theme.Forest
import app.varlikhafizasi.ui.theme.Line
import app.varlikhafizasi.ui.theme.Muted
import app.varlikhafizasi.ui.theme.PaperDeep
import kotlinx.coroutines.launch

@Composable
fun LocationPicker(
    locationName: String,
    onLocationNameChange: (String) -> Unit,
    latitude: Double?,
    longitude: Double?,
    onLocationPicked: (PickedLocation) -> Unit,
    enabled: Boolean,
    modifier: Modifier = Modifier,
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }

    val deniedMessage = stringResource(R.string.assets_location_permission_denied)
    val unavailableMessage = stringResource(R.string.assets_location_unavailable)

    fun fetchLocation() {
        if (busy) return
        error = null
        scope.launch {
            busy = true
            try {
                onLocationPicked(fetchCurrentLocation(context))
            } catch (_: Exception) {
                error = unavailableMessage
            } finally {
                busy = false
            }
        }
    }

    val permissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions(),
    ) { grants ->
        if (grants.values.any { it }) {
            fetchLocation()
        } else {
            error = deniedMessage
        }
    }

    fun requestLocation() {
        error = null
        if (hasLocationPermission(context)) {
            fetchLocation()
        } else {
            permissionLauncher.launch(locationPermissions)
        }
    }

    Column(modifier) {
        SectionLabel(stringResource(R.string.assets_location_label))
        OutlinedTextField(
            value = locationName,
            onValueChange = { onLocationNameChange(it.take(160)) },
            label = { Text(stringResource(R.string.assets_location_name_label)) },
            placeholder = { Text(stringResource(R.string.assets_location_name_placeholder)) },
            singleLine = true,
            enabled = enabled,
            modifier = Modifier.fillMaxWidth(),
        )
        Spacer(Modifier.height(8.dp))
        OutlinedButton(
            onClick = { requestLocation() },
            enabled = enabled && !busy,
            shape = RoundedCornerShape(12.dp),
            border = BorderStroke(1.dp, Line),
            modifier = Modifier.fillMaxWidth(),
        ) {
            if (busy) {
                CircularProgressIndicator(
                    strokeWidth = 2.dp,
                    color = Forest,
                    modifier = Modifier.size(16.dp),
                )
                Spacer(Modifier.size(8.dp))
                Text(
                    stringResource(R.string.assets_location_fetching),
                    color = Forest,
                    style = MaterialTheme.typography.bodyMedium,
                )
            } else {
                Icon(
                    Icons.Outlined.MyLocation,
                    contentDescription = null,
                    tint = Forest,
                    modifier = Modifier.size(18.dp),
                )
                Spacer(Modifier.size(8.dp))
                Text(
                    stringResource(
                        if (latitude != null && longitude != null) {
                            R.string.assets_location_update
                        } else {
                            R.string.assets_location_use
                        },
                    ),
                    color = Forest,
                    style = MaterialTheme.typography.bodyMedium,
                )
            }
        }

        if (latitude != null && longitude != null) {
            Spacer(Modifier.height(8.dp))
            Surface(
                color = PaperDeep,
                shape = RoundedCornerShape(12.dp),
                border = BorderStroke(1.dp, Line),
                modifier = Modifier.fillMaxWidth(),
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    Icon(
                        Icons.Outlined.Place,
                        contentDescription = null,
                        tint = Forest,
                        modifier = Modifier.size(18.dp),
                    )
                    Text(
                        formatCoordinates(latitude, longitude),
                        style = MaterialTheme.typography.bodySmall,
                        color = Forest,
                        modifier = Modifier.weight(1f),
                    )
                    TextButton(
                        onClick = { openInMaps(context, latitude, longitude, locationName) },
                        enabled = enabled,
                    ) {
                        Text(
                            stringResource(R.string.assets_location_open_maps),
                            style = MaterialTheme.typography.labelMedium,
                            color = Forest,
                        )
                    }
                }
            }
        }

        if (error != null) {
            Spacer(Modifier.height(4.dp))
            Text(
                error ?: "",
                style = MaterialTheme.typography.bodySmall,
                color = Danger,
            )
        }
        Spacer(Modifier.height(4.dp))
        Text(
            stringResource(R.string.assets_location_hint),
            style = MaterialTheme.typography.bodySmall,
            color = Muted,
        )
    }
}
