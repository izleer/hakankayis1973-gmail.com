package app.varlikhafizasi.ui.local

import android.app.DatePickerDialog
import android.app.TimePickerDialog
import android.content.Context
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Alarm
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material.icons.outlined.Close
import androidx.compose.material.icons.outlined.Map
import androidx.compose.material.icons.outlined.PhotoCamera
import androidx.compose.material.icons.outlined.PhotoLibrary
import androidx.compose.material.icons.outlined.Place
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import app.varlikhafizasi.R
import app.varlikhafizasi.ui.components.LocationMapDialog
import app.varlikhafizasi.ui.components.Pill
import app.varlikhafizasi.ui.components.SectionLabel
import app.varlikhafizasi.ui.components.VhTopBar
import app.varlikhafizasi.ui.screens.formatCoordinates
import app.varlikhafizasi.ui.screens.openInMaps
import app.varlikhafizasi.ui.screens.reverseGeocodeLocation
import app.varlikhafizasi.ui.theme.Forest
import app.varlikhafizasi.ui.theme.Ivory
import app.varlikhafizasi.ui.theme.Line
import app.varlikhafizasi.ui.theme.Muted
import app.varlikhafizasi.ui.theme.Paper
import app.varlikhafizasi.ui.theme.PaperDeep
import app.varlikhafizasi.ui.theme.TerracottaInk
import coil.compose.AsyncImage
import kotlinx.coroutines.launch
import java.io.File
import java.util.Calendar

@Composable
fun LocalEntryFormScreen(
    vm: LocalViewModel,
    assetId: String,
    entryId: String?,
    onBack: () -> Unit,
) {
    val editing = entryId != null
    val state by vm.asset.collectAsStateWithLifecycle()
    val context = LocalContext.current
    val existing = state.data?.entries?.firstOrNull { it.id == entryId }

    var kind by rememberSaveable(entryId) { mutableStateOf("note") }
    var title by rememberSaveable(entryId) { mutableStateOf("") }
    var body by rememberSaveable(entryId) { mutableStateOf("") }
    var occurredAt by rememberSaveable(entryId) { mutableStateOf(System.currentTimeMillis()) }
    var reminderOn by rememberSaveable(entryId) { mutableStateOf(false) }
    var dueAt by rememberSaveable(entryId) { mutableStateOf<Long?>(null) }
    var seeded by rememberSaveable(entryId) { mutableStateOf(false) }
    var newPhoto by remember { mutableStateOf<File?>(null) }
    var pickedUri by remember { mutableStateOf<Uri?>(null) }
    var removePhoto by rememberSaveable(entryId) { mutableStateOf(false) }
    var pendingCapture by remember { mutableStateOf<File?>(null) }
    var confirmDelete by rememberSaveable { mutableStateOf(false) }
    var locationName by rememberSaveable(entryId) { mutableStateOf("") }
    var latitude by rememberSaveable(entryId) { mutableStateOf<Double?>(null) }
    var longitude by rememberSaveable(entryId) { mutableStateOf<Double?>(null) }
    var mapOpen by rememberSaveable(entryId) { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(assetId) { vm.loadAsset(assetId) }
    LaunchedEffect(existing?.id) {
        val entry = existing ?: return@LaunchedEffect
        if (seeded) return@LaunchedEffect
        kind = entry.kind
        title = entry.title.orEmpty()
        body = entry.body.orEmpty()
        occurredAt = entry.occurredAt
        reminderOn = entry.dueAt != null
        dueAt = entry.dueAt
        locationName = entry.locationName.orEmpty()
        latitude = entry.latitude
        longitude = entry.longitude
        seeded = true
    }

    val gallery = rememberLauncherForActivityResult(
        ActivityResultContracts.GetContent(),
    ) { uri ->
        if (uri != null) {
            pickedUri = uri
            newPhoto = null
            removePhoto = false
        }
    }
    val camera = rememberLauncherForActivityResult(
        ActivityResultContracts.TakePicture(),
    ) { saved ->
        val file = pendingCapture
        pendingCapture = null
        if (saved && file != null) {
            newPhoto = file
            pickedUri = null
            removePhoto = false
        } else if (file != null) {
            vm.discardFile(file)
        }
    }

    fun capture() {
        val file = vm.newCaptureFile("kayit")
        pendingCapture = file
        runCatching { camera.launch(vm.captureUri(file)) }
            .onFailure {
                vm.discardFile(file)
                pendingCapture = null
            }
    }

    fun defaultReminder(): Long {
        val cal = Calendar.getInstance().apply {
            add(Calendar.DAY_OF_YEAR, 7)
            set(Calendar.HOUR_OF_DAY, 9)
            set(Calendar.MINUTE, 0)
            set(Calendar.SECOND, 0)
        }
        return cal.timeInMillis
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Paper),
    ) {
        VhTopBar(
            title = stringResource(
                if (editing) R.string.local_entry_edit_title else R.string.local_entry_new_title,
            ),
            onBack = onBack,
        )

        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .imePadding()
                .padding(horizontal = 20.dp, vertical = 8.dp),
        ) {
            SectionLabel(stringResource(R.string.local_entry_kind))
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                localKinds.chunked(3).forEach { row ->
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        row.forEach { option ->
                            Pill(
                                text = localKindLabel(option),
                                selected = kind == option,
                                onClick = { kind = option },
                            )
                        }
                    }
                }
            }

            Spacer(Modifier.height(16.dp))
            OutlinedTextField(
                value = title,
                onValueChange = { title = it },
                label = { Text(stringResource(R.string.local_entry_title_label)) },
                placeholder = { Text(stringResource(R.string.local_entry_title_placeholder), color = Muted) },
                singleLine = true,
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = Forest,
                    unfocusedBorderColor = Line,
                ),
                modifier = Modifier.fillMaxWidth(),
            )
            Spacer(Modifier.height(12.dp))
            OutlinedTextField(
                value = body,
                onValueChange = { body = it },
                label = { Text(stringResource(R.string.local_entry_body_label)) },
                placeholder = { Text(stringResource(R.string.local_entry_body_placeholder), color = Muted) },
                minLines = 3,
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = Forest,
                    unfocusedBorderColor = Line,
                ),
                modifier = Modifier.fillMaxWidth(),
            )

            Spacer(Modifier.height(14.dp))
            SectionLabel(stringResource(R.string.local_entry_date))
            Surface(
                color = Ivory,
                shape = RoundedCornerShape(14.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable {
                        pickDate(context, occurredAt) { occurredAt = it }
                    },
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 14.dp, vertical = 13.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(Icons.Outlined.CalendarMonth, contentDescription = null, tint = TerracottaInk, modifier = Modifier.size(19.dp))
                    Spacer(Modifier.size(10.dp))
                    Text(
                        formatLocalDate(occurredAt, withTime = true),
                        style = MaterialTheme.typography.bodyMedium,
                        color = Forest,
                    )
                }
            }

            Spacer(Modifier.height(14.dp))
            Surface(
                color = Ivory,
                shape = RoundedCornerShape(14.dp),
                modifier = Modifier.fillMaxWidth(),
            ) {
                Column(Modifier.padding(horizontal = 14.dp, vertical = 8.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Outlined.Alarm, contentDescription = null, tint = TerracottaInk, modifier = Modifier.size(19.dp))
                        Spacer(Modifier.size(10.dp))
                        Text(
                            stringResource(R.string.local_entry_reminder_on),
                            style = MaterialTheme.typography.bodyMedium,
                            color = Forest,
                            modifier = Modifier.weight(1f),
                        )
                        Switch(
                            checked = reminderOn,
                            onCheckedChange = { on ->
                                reminderOn = on
                                if (on) {
                                    if (dueAt == null) dueAt = defaultReminder()
                                } else {
                                    dueAt = null
                                }
                            },
                            colors = SwitchDefaults.colors(
                                checkedThumbColor = Paper,
                                checkedTrackColor = Forest,
                            ),
                        )
                    }
                    if (reminderOn && dueAt != null) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable {
                                    pickDateTime(context, dueAt ?: defaultReminder()) { dueAt = it }
                                }
                                .padding(vertical = 6.dp),
                        ) {
                            Text(
                                formatLocalDate(dueAt!!, withTime = true),
                                style = MaterialTheme.typography.labelMedium,
                                color = TerracottaInk,
                            )
                            Text(
                                stringResource(R.string.local_entry_reminder_time),
                                style = MaterialTheme.typography.labelSmall,
                                color = Muted,
                                modifier = Modifier.padding(top = 2.dp),
                            )
                        }
                    }
                }
            }

            Spacer(Modifier.height(16.dp))
            SectionLabel(stringResource(R.string.add_entry_section_location))
            OutlinedTextField(
                value = locationName,
                onValueChange = { locationName = it.take(160) },
                label = { Text(stringResource(R.string.assets_location_name_label)) },
                placeholder = { Text(stringResource(R.string.assets_location_name_placeholder), color = Muted) },
                singleLine = true,
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = Forest,
                    unfocusedBorderColor = Line,
                ),
                modifier = Modifier.fillMaxWidth(),
            )
            Spacer(Modifier.height(8.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedButton(
                    onClick = { mapOpen = true },
                    shape = RoundedCornerShape(12.dp),
                    border = BorderStroke(1.dp, Line),
                    modifier = Modifier.weight(1f),
                ) {
                    Icon(
                        Icons.Outlined.Map,
                        contentDescription = null,
                        tint = Forest,
                        modifier = Modifier.size(16.dp),
                    )
                    Spacer(Modifier.size(6.dp))
                    Text(
                        stringResource(R.string.add_entry_location_pick),
                        style = MaterialTheme.typography.labelMedium,
                        color = Forest,
                    )
                }
                if (latitude != null && longitude != null) {
                    OutlinedButton(
                        onClick = {
                            latitude = null
                            longitude = null
                            locationName = ""
                        },
                        shape = RoundedCornerShape(12.dp),
                        border = BorderStroke(1.dp, Line),
                    ) {
                        Icon(
                            Icons.Outlined.Close,
                            contentDescription = null,
                            tint = Muted,
                            modifier = Modifier.size(14.dp),
                        )
                        Spacer(Modifier.size(4.dp))
                        Text(
                            stringResource(R.string.add_entry_location_clear),
                            style = MaterialTheme.typography.labelMedium,
                            color = Muted,
                        )
                    }
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
                            modifier = Modifier.size(16.dp),
                        )
                        Text(
                            locationName.ifBlank { formatCoordinates(latitude!!, longitude!!) },
                            style = MaterialTheme.typography.bodySmall,
                            color = Forest,
                            modifier = Modifier.weight(1f),
                        )
                        TextButton(
                            onClick = {
                                val lat = latitude
                                val lng = longitude
                                if (lat != null && lng != null) {
                                    openInMaps(context, lat, lng, locationName.ifBlank { null })
                                }
                            },
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
            Text(
                stringResource(R.string.add_entry_location_hint),
                style = MaterialTheme.typography.bodySmall,
                color = Muted,
                modifier = Modifier.padding(top = 5.dp),
            )

            Spacer(Modifier.height(14.dp))
            SectionLabel(stringResource(R.string.local_entry_photo))
            Text(
                stringResource(R.string.local_limit_photo_hint),
                style = MaterialTheme.typography.bodySmall,
                color = Muted,
                modifier = Modifier.padding(top = 4.dp, bottom = 8.dp),
            )
            val currentPhoto: Any? = when {
                newPhoto != null -> newPhoto
                pickedUri != null -> pickedUri
                removePhoto -> null
                else -> vm.mediaFile(existing?.photoPath)
            }
            if (currentPhoto != null) {
                Box {
                    AsyncImage(
                        model = currentPhoto,
                        contentDescription = null,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(170.dp)
                            .clip(RoundedCornerShape(16.dp)),
                    )
                    Text(
                        stringResource(R.string.local_entry_photo_remove),
                        style = MaterialTheme.typography.labelSmall,
                        color = Color.White,
                        modifier = Modifier
                            .align(Alignment.BottomEnd)
                            .padding(10.dp)
                            .background(Forest.copy(alpha = 0.75f), RoundedCornerShape(50))
                            .clickable {
                                newPhoto = null
                                pickedUri = null
                                removePhoto = true
                            }
                            .padding(horizontal = 10.dp, vertical = 6.dp),
                    )
                }
            } else {
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    PhotoAction(
                        icon = Icons.Outlined.PhotoCamera,
                        label = stringResource(R.string.local_form_camera),
                        modifier = Modifier.weight(1f),
                        onClick = { capture() },
                    )
                    PhotoAction(
                        icon = Icons.Outlined.PhotoLibrary,
                        label = stringResource(R.string.local_form_gallery),
                        modifier = Modifier.weight(1f),
                        onClick = { gallery.launch("image/*") },
                    )
                }
            }

            Spacer(Modifier.height(22.dp))
            Surface(
                color = Forest,
                shape = RoundedCornerShape(50),
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable {
                        vm.saveEntry(
                            entryId = entryId,
                            assetId = assetId,
                            kind = kind,
                            title = title,
                            body = body,
                            occurredAt = occurredAt,
                            dueAt = if (reminderOn) dueAt else null,
                            newPhotoFile = newPhoto,
                            newPhotoUri = pickedUri,
                            removePhoto = removePhoto,
                            locationName = locationName,
                            latitude = latitude,
                            longitude = longitude,
                            onDone = onBack,
                        )
                    },
            ) {
                Text(
                    stringResource(R.string.local_form_save),
                    style = MaterialTheme.typography.labelLarge,
                    color = Paper,
                    fontWeight = FontWeight.SemiBold,
                    textAlign = TextAlign.Center,
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 14.dp),
                )
            }
            if (editing) {
                Spacer(Modifier.height(8.dp))
                TextButton(
                    onClick = { confirmDelete = true },
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text(stringResource(R.string.local_delete), color = TerracottaInk)
                }
            }
            Spacer(Modifier.height(24.dp))
        }
    }

    if (mapOpen) {
        LocationMapDialog(
            initialLatitude = latitude,
            initialLongitude = longitude,
            onDismiss = { mapOpen = false },
            onConfirm = { picked ->
                latitude = picked.latitude
                longitude = picked.longitude
                mapOpen = false
                // Haritada seçilen nokta kaydedilsin; adres yeni noktaya göre yazılır.
                scope.launch {
                    val resolved = reverseGeocodeLocation(
                        context,
                        picked.latitude,
                        picked.longitude,
                    )?.take(160)
                    if (!resolved.isNullOrBlank()) locationName = resolved
                }
            },
        )
    }

    if (confirmDelete && entryId != null) {
        AlertDialog(
            onDismissRequest = { confirmDelete = false },
            title = { Text(stringResource(R.string.local_entry_delete_confirm)) },
            confirmButton = {
                TextButton(onClick = {
                    confirmDelete = false
                    vm.deleteEntry(entryId, assetId)
                    onBack()
                }) {
                    Text(stringResource(R.string.local_delete), color = TerracottaInk)
                }
            },
            dismissButton = {
                TextButton(onClick = { confirmDelete = false }) {
                    Text(stringResource(R.string.local_cancel), color = Muted)
                }
            },
        )
    }
}

@Composable
private fun PhotoAction(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    modifier: Modifier = Modifier,
    onClick: () -> Unit,
) {
    Surface(
        color = Ivory,
        shape = RoundedCornerShape(14.dp),
        modifier = modifier.clickable { onClick() },
    ) {
        Column(
            modifier = Modifier.padding(vertical = 18.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Icon(icon, contentDescription = null, tint = TerracottaInk, modifier = Modifier.size(22.dp))
            Spacer(Modifier.height(5.dp))
            Text(label, style = MaterialTheme.typography.labelMedium, color = Forest)
        }
    }
}

private fun pickDate(context: Context, initialMillis: Long, onPicked: (Long) -> Unit) {
    val calendar = Calendar.getInstance().apply { timeInMillis = initialMillis }
    DatePickerDialog(
        context,
        { _, year, month, day ->
            val picked = Calendar.getInstance().apply {
                timeInMillis = initialMillis
                set(Calendar.YEAR, year)
                set(Calendar.MONTH, month)
                set(Calendar.DAY_OF_MONTH, day)
            }
            onPicked(picked.timeInMillis)
        },
        calendar.get(Calendar.YEAR),
        calendar.get(Calendar.MONTH),
        calendar.get(Calendar.DAY_OF_MONTH),
    ).show()
}

private fun pickDateTime(context: Context, initialMillis: Long, onPicked: (Long) -> Unit) {
    val calendar = Calendar.getInstance().apply { timeInMillis = initialMillis }
    DatePickerDialog(
        context,
        { _, year, month, day ->
            TimePickerDialog(
                context,
                { _, hour, minute ->
                    val picked = Calendar.getInstance().apply {
                        timeInMillis = initialMillis
                        set(Calendar.YEAR, year)
                        set(Calendar.MONTH, month)
                        set(Calendar.DAY_OF_MONTH, day)
                        set(Calendar.HOUR_OF_DAY, hour)
                        set(Calendar.MINUTE, minute)
                        set(Calendar.SECOND, 0)
                        set(Calendar.MILLISECOND, 0)
                    }
                    onPicked(picked.timeInMillis)
                },
                calendar.get(Calendar.HOUR_OF_DAY),
                calendar.get(Calendar.MINUTE),
                true,
            ).show()
        },
        calendar.get(Calendar.YEAR),
        calendar.get(Calendar.MONTH),
        calendar.get(Calendar.DAY_OF_MONTH),
    ).show()
}
