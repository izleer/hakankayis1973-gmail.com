package app.varlikhafizasi.ui.screens

import android.app.DatePickerDialog
import android.app.TimePickerDialog
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.AddPhotoAlternate
import androidx.compose.material.icons.outlined.Alarm
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material.icons.outlined.Close
import androidx.compose.material.icons.outlined.Edit
import androidx.compose.material.icons.outlined.Map
import androidx.compose.material.icons.outlined.PhotoCamera
import androidx.compose.material.icons.outlined.Place
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
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
import androidx.compose.runtime.saveable.Saver
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import app.varlikhafizasi.R
import app.varlikhafizasi.data.MeasurementInput
import app.varlikhafizasi.ui.VhViewModel
import app.varlikhafizasi.ui.components.ErrorBox
import app.varlikhafizasi.ui.components.GoldRule
import app.varlikhafizasi.ui.components.LoadingBox
import app.varlikhafizasi.ui.components.LocationMapDialog
import app.varlikhafizasi.ui.components.MediaThumb
import app.varlikhafizasi.ui.components.Pill
import app.varlikhafizasi.ui.components.SectionLabel
import app.varlikhafizasi.ui.components.VhTopBar
import app.varlikhafizasi.ui.components.entryTypeLabel
import app.varlikhafizasi.ui.components.formatDateTime
import app.varlikhafizasi.ui.components.visibilityLabel
import app.varlikhafizasi.ui.theme.Clay
import app.varlikhafizasi.ui.theme.Danger
import app.varlikhafizasi.ui.theme.Forest
import app.varlikhafizasi.ui.theme.Line
import app.varlikhafizasi.ui.theme.Muted
import app.varlikhafizasi.ui.theme.Paper
import app.varlikhafizasi.ui.theme.PaperDeep
import coil.compose.AsyncImage
import kotlinx.coroutines.launch
import java.time.Instant
import java.util.Calendar

private val entryTypes = listOf(
    "note", "photo", "maintenance", "health", "measurement", "acquisition", "event", "document",
    "reminder",
)

/** Hatırlatma için makul başlangıç: yarın sabah 09:00. */
private fun defaultReminderAt(): Long {
    val calendar = Calendar.getInstance()
    calendar.add(Calendar.DAY_OF_MONTH, 1)
    calendar.set(Calendar.HOUR_OF_DAY, 9)
    calendar.set(Calendar.MINUTE, 0)
    calendar.set(Calendar.SECOND, 0)
    calendar.set(Calendar.MILLISECOND, 0)
    return calendar.timeInMillis
}

private val UriStateSaver = Saver<Uri?, String>(
    save = { it?.toString().orEmpty() },
    restore = { value -> value.takeIf { it.isNotEmpty() }?.let(Uri::parse) },
)

private val UriListStateSaver = Saver<List<Uri>, ArrayList<String>>(
    save = { uris -> ArrayList(uris.map(Uri::toString)) },
    restore = { values -> values.map(Uri::parse) },
)

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun AddEntryScreen(
    vm: VhViewModel,
    assetId: String,
    entryId: String? = null,
    onBack: () -> Unit,
    onSaved: () -> Unit,
) {
    val state by vm.detail.collectAsStateWithLifecycle()
    val entryState by vm.entryDraft.collectAsStateWithLifecycle()
    val busy by vm.formBusy.collectAsStateWithLifecycle()
    val error by vm.formError.collectAsStateWithLifecycle()

    val editing = entryId != null
    val draft = if (editing) entryState.data else null

    var type by rememberSaveable { mutableStateOf("note") }
    var title by rememberSaveable { mutableStateOf("") }
    var body by rememberSaveable { mutableStateOf("") }
    var visibility by rememberSaveable { mutableStateOf("private") }
    var locationName by rememberSaveable { mutableStateOf("") }
    var latitude by rememberSaveable { mutableStateOf<Double?>(null) }
    var longitude by rememberSaveable { mutableStateOf<Double?>(null) }
    var clearLocation by rememberSaveable { mutableStateOf(false) }
    var mapOpen by rememberSaveable { mutableStateOf(false) }
    var seeded by rememberSaveable(entryId) { mutableStateOf(false) }
    var defaultSeeded by rememberSaveable(assetId) { mutableStateOf(false) }
    var metric by rememberSaveable { mutableStateOf("") }
    var value by rememberSaveable { mutableStateOf("") }
    var unit by rememberSaveable { mutableStateOf("") }
    var mediaUris by rememberSaveable(stateSaver = UriListStateSaver) { mutableStateOf<List<Uri>>(emptyList()) }
    var pendingMediaUri by rememberSaveable(stateSaver = UriStateSaver) { mutableStateOf<Uri?>(null) }
    var occurredAt by rememberSaveable { mutableStateOf(System.currentTimeMillis()) }
    var dueAt by rememberSaveable { mutableStateOf(defaultReminderAt()) }
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val cameraUnavailable = stringResource(R.string.media_camera_unavailable)

    fun openDateTimePicker(
        initialMillis: Long,
        minDateMillis: Long?,
        onPicked: (Long) -> Unit,
    ) {
        val calendar = Calendar.getInstance().apply { timeInMillis = initialMillis }
        val dialog = DatePickerDialog(
            context,
            { _, year, month, day ->
                calendar.set(Calendar.YEAR, year)
                calendar.set(Calendar.MONTH, month)
                calendar.set(Calendar.DAY_OF_MONTH, day)
                TimePickerDialog(
                    context,
                    { _, hour, minute ->
                        calendar.set(Calendar.HOUR_OF_DAY, hour)
                        calendar.set(Calendar.MINUTE, minute)
                        calendar.set(Calendar.SECOND, 0)
                        calendar.set(Calendar.MILLISECOND, 0)
                        onPicked(calendar.timeInMillis)
                    },
                    calendar.get(Calendar.HOUR_OF_DAY),
                    calendar.get(Calendar.MINUTE),
                    true,
                ).show()
            },
            calendar.get(Calendar.YEAR),
            calendar.get(Calendar.MONTH),
            calendar.get(Calendar.DAY_OF_MONTH),
        )
        minDateMillis?.let { dialog.datePicker.minDate = it }
        dialog.show()
    }

    fun openOccurredAtPicker() {
        openDateTimePicker(occurredAt, null) { occurredAt = it }
    }

    val asset = state.data?.detail?.asset
    val assetTitle = asset?.title ?: stringResource(R.string.common_asset)
    val assetVisibility = asset?.visibility ?: "private"

    LaunchedEffect(assetId) {
        if (state.data?.detail?.asset?.id != assetId) vm.loadDetail(assetId)
        vm.clearFormError()
    }

    LaunchedEffect(entryId) {
        vm.clearFormError()
        if (entryId != null) vm.loadEntry(entryId) else vm.clearEntryDraft()
    }

    // Arkadaşlara açık varlıkta yeni kayıt, varlığın görünürlüğüyle başlar.
    LaunchedEffect(asset?.id) {
        if (!editing && !defaultSeeded && asset != null) {
            if (assetVisibility == "friends") visibility = "friends"
            defaultSeeded = true
        }
    }

    // Ekrandan çıkarken taslağı bırak; aynı kaydı yeniden düzenlerken
    // önceki oturumun eski alanlarıyla dolmasını engeller.
    DisposableEffect(entryId) {
        onDispose {
            if (editing) vm.clearEntryDraft()
        }
    }

    // Düzenlemede alanları mevcut kayıttan bir kez doldur.
    LaunchedEffect(draft?.id) {
        val entry = draft ?: return@LaunchedEffect
        if (seeded) return@LaunchedEffect
        type = entry.type
        title = entry.title.orEmpty()
        body = entry.body.orEmpty()
        visibility = entry.visibility
        locationName = entry.locationName.orEmpty()
        latitude = entry.latitude
        longitude = entry.longitude
        clearLocation = false
        occurredAt = runCatching { Instant.parse(entry.occurredAt).toEpochMilli() }
            .getOrDefault(System.currentTimeMillis())
        dueAt = entry.dueAt
            ?.let { runCatching { Instant.parse(it).toEpochMilli() }.getOrNull() }
            ?: defaultReminderAt()
        seeded = true
    }

    val picker = rememberLauncherForActivityResult(
        ActivityResultContracts.GetMultipleContents(),
    ) { uris ->
        if (uris.isNotEmpty()) {
            mediaUris = (mediaUris + uris).take(6)
        }
    }

    val camera = rememberLauncherForActivityResult(ActivityResultContracts.TakePicture()) { saved ->
        val captured = pendingMediaUri
        pendingMediaUri = null
        if (saved && captured != null) {
            mediaUris = (mediaUris + captured).take(6)
        }
    }

    fun capturePhoto() {
        if (mediaUris.size >= 6) return
        val target = runCatching { createCaptureUri(context, "entry") }.getOrElse {
            vm.setNotice(cameraUnavailable)
            return
        }
        pendingMediaUri = target
        runCatching { camera.launch(target) }.onFailure {
            pendingMediaUri = null
            vm.setNotice(cameraUnavailable)
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Paper),
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .imePadding(),
        ) {
            VhTopBar(
                title = stringResource(
                    if (editing) R.string.edit_entry_title else R.string.add_entry_title,
                ),
                onBack = onBack,
                subtitle = assetTitle,
            )

            if (editing && entryState.loading) {
                LoadingBox()
            }
            if (editing && entryState.error != null) {
                Box(Modifier.padding(horizontal = 20.dp, vertical = 8.dp)) {
                    ErrorBox(
                        entryState.error ?: "",
                        onRetry = { entryId?.let(vm::loadEntry) },
                    )
                }
            }

        Column(Modifier.padding(horizontal = 20.dp)) {
            Text(
                stringResource(
                    if (editing) R.string.edit_entry_eyebrow else R.string.add_entry_eyebrow,
                ),
                style = MaterialTheme.typography.labelSmall,
                color = Clay,
            )
            Spacer(Modifier.height(4.dp))
            Text(
                stringResource(
                    if (editing) R.string.edit_entry_headline else R.string.add_entry_headline,
                ),
                style = MaterialTheme.typography.headlineLarge,
                color = Forest,
            )
            Spacer(Modifier.height(10.dp))
            GoldRule()
            Spacer(Modifier.height(12.dp))
            Text(
                stringResource(
                    if (editing) R.string.edit_entry_intro else R.string.add_entry_intro,
                ),
                style = MaterialTheme.typography.bodySmall,
                color = Muted,
            )

            Spacer(Modifier.height(20.dp))
            SectionLabel(stringResource(R.string.add_entry_section_type))
            FlowRow(
                horizontalArrangement = Arrangement.spacedBy(7.dp),
                verticalArrangement = Arrangement.spacedBy(7.dp),
            ) {
                entryTypes.forEach { typeKey ->
                    Pill(
                        text = entryTypeLabel(typeKey),
                        selected = type == typeKey,
                        onClick = { type = typeKey },
                    )
                }
            }

            Spacer(Modifier.height(18.dp))
            OutlinedTextField(
                value = title,
                onValueChange = { title = it.take(140) },
                label = { Text(stringResource(R.string.add_entry_field_title)) },
                singleLine = true,
                enabled = !busy,
                modifier = Modifier.fillMaxWidth(),
            )
            Spacer(Modifier.height(10.dp))
            OutlinedTextField(
                value = body,
                onValueChange = { body = it.take(5000) },
                label = { Text(stringResource(R.string.add_entry_field_notes)) },
                placeholder = { Text(stringResource(R.string.add_entry_notes_placeholder)) },
                minLines = 4,
                enabled = !busy,
                modifier = Modifier.fillMaxWidth(),
            )

            Spacer(Modifier.height(18.dp))
            SectionLabel(stringResource(R.string.add_entry_section_when))
            Surface(
                color = PaperDeep,
                shape = RoundedCornerShape(14.dp),
                border = BorderStroke(1.dp, Line),
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { openOccurredAtPicker() },
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 14.dp, vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(
                        Icons.Outlined.CalendarMonth,
                        contentDescription = null,
                        tint = Forest,
                        modifier = Modifier.size(20.dp),
                    )
                    Spacer(Modifier.size(10.dp))
                    Column(Modifier.weight(1f)) {
                        Text(
                            formatDateTime(occurredAt),
                            style = MaterialTheme.typography.titleSmall,
                            color = Forest,
                        )
                        Text(
                            stringResource(R.string.add_entry_change_datetime),
                            style = MaterialTheme.typography.bodySmall,
                            color = Muted,
                        )
                    }
                    Icon(
                        Icons.Outlined.Edit,
                        contentDescription = null,
                        tint = Muted,
                        modifier = Modifier.size(18.dp),
                    )
                }
            }

            if (type == "reminder") {
                Spacer(Modifier.height(18.dp))
                SectionLabel(stringResource(R.string.add_entry_section_reminder))
                Surface(
                    color = PaperDeep,
                    shape = RoundedCornerShape(14.dp),
                    border = BorderStroke(1.dp, Line),
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable {
                            openDateTimePicker(
                                dueAt,
                                if (editing) null else System.currentTimeMillis(),
                            ) { dueAt = it }
                        },
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 14.dp, vertical = 12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Icon(
                            Icons.Outlined.Alarm,
                            contentDescription = null,
                            tint = Clay,
                            modifier = Modifier.size(20.dp),
                        )
                        Spacer(Modifier.size(10.dp))
                        Column(Modifier.weight(1f)) {
                            Text(
                                formatDateTime(dueAt),
                                style = MaterialTheme.typography.titleSmall,
                                color = Forest,
                            )
                            Text(
                                stringResource(R.string.add_entry_reminder_change),
                                style = MaterialTheme.typography.bodySmall,
                                color = Muted,
                            )
                        }
                        Icon(
                            Icons.Outlined.Edit,
                            contentDescription = null,
                            tint = Muted,
                            modifier = Modifier.size(18.dp),
                        )
                    }
                }
                Text(
                    stringResource(
                        if (editing) {
                            R.string.add_entry_reminder_edit_hint
                        } else {
                            R.string.add_entry_reminder_hint
                        },
                    ),
                    style = MaterialTheme.typography.bodySmall,
                    color = Muted,
                    modifier = Modifier.padding(top = 5.dp),
                )
            }

            Spacer(Modifier.height(18.dp))
            SectionLabel(stringResource(R.string.add_entry_section_location))
            OutlinedTextField(
                value = locationName,
                onValueChange = { locationName = it.take(160) },
                label = { Text(stringResource(R.string.assets_location_name_label)) },
                placeholder = { Text(stringResource(R.string.assets_location_name_placeholder)) },
                singleLine = true,
                enabled = !busy,
                modifier = Modifier.fillMaxWidth(),
            )
            Spacer(Modifier.height(8.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedButton(
                    onClick = { mapOpen = true },
                    enabled = !busy,
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
                            clearLocation = true
                        },
                        enabled = !busy,
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

            if (type == "measurement") {
                Spacer(Modifier.height(16.dp))
                SectionLabel(stringResource(R.string.add_entry_section_measurement))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(
                        value = metric,
                        onValueChange = { metric = it.take(60) },
                        label = { Text(stringResource(R.string.add_entry_metric)) },
                        placeholder = { Text(stringResource(R.string.add_entry_metric_placeholder)) },
                        singleLine = true,
                        enabled = !busy,
                        modifier = Modifier.weight(1.4f),
                    )
                    OutlinedTextField(
                        value = value,
                        onValueChange = { value = it.take(12) },
                        label = { Text(stringResource(R.string.add_entry_value)) },
                        singleLine = true,
                        enabled = !busy,
                        modifier = Modifier.weight(1f),
                    )
                    OutlinedTextField(
                        value = unit,
                        onValueChange = { unit = it.take(20) },
                        label = { Text(stringResource(R.string.add_entry_unit)) },
                        placeholder = { Text(stringResource(R.string.add_entry_unit_placeholder)) },
                        singleLine = true,
                        enabled = !busy,
                        modifier = Modifier.weight(1f),
                    )
                }
                Spacer(Modifier.height(4.dp))
                Text(
                    stringResource(R.string.add_entry_measurement_hint),
                    style = MaterialTheme.typography.bodySmall,
                    color = Muted,
                )
            }

            Spacer(Modifier.height(18.dp))
            SectionLabel(stringResource(R.string.add_entry_section_visibility))
            val baseAllowed = when (assetVisibility) {
                "public" -> listOf("private", "selected", "friends", "public")
                "friends" -> listOf("private", "selected", "friends")
                "selected" -> listOf("private", "selected")
                else -> listOf("private")
            }
            val allowed = if (draft != null && draft.visibility !in baseAllowed) {
                baseAllowed + draft.visibility
            } else {
                baseAllowed
            }
            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                allowed.forEach { option ->
                    Pill(
                        text = visibilityLabel(option),
                        selected = visibility == option,
                        onClick = { visibility = option },
                    )
                }
            }
            Text(
                stringResource(R.string.add_entry_visibility_hint),
                style = MaterialTheme.typography.bodySmall,
                color = Muted,
                modifier = Modifier.padding(top = 5.dp),
            )

            Spacer(Modifier.height(18.dp))
            SectionLabel(stringResource(R.string.add_entry_section_files))

            if (editing && !draft?.media.isNullOrEmpty()) {
                Text(
                    stringResource(R.string.edit_entry_existing_files),
                    style = MaterialTheme.typography.bodySmall,
                    color = Muted,
                )
                Spacer(Modifier.height(8.dp))
                FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    draft?.media?.forEach { media ->
                        MediaThumb(
                            media = media,
                            height = 82.dp,
                            modifier = Modifier.width(82.dp),
                        )
                    }
                }
                Spacer(Modifier.height(10.dp))
                Text(
                    stringResource(R.string.edit_entry_add_files_hint),
                    style = MaterialTheme.typography.bodySmall,
                    color = Muted,
                )
                Spacer(Modifier.height(6.dp))
            }

            Surface(
                color = PaperDeep,
                shape = RoundedCornerShape(14.dp),
                border = BorderStroke(1.dp, Line),
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { picker.launch("*/*") },
            ) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    modifier = Modifier.padding(vertical = 18.dp),
                ) {
                    Icon(
                        Icons.Outlined.AddPhotoAlternate,
                        contentDescription = null,
                        tint = Forest,
                    )
                    Spacer(Modifier.height(5.dp))
                    Text(
                        stringResource(
                            R.string.add_entry_add_file,
                            pluralStringResource(R.plurals.add_entry_media_limit_count, 6, 6),
                            10,
                        ),
                        style = MaterialTheme.typography.bodySmall,
                        color = Muted,
                    )
                }
            }

            Spacer(Modifier.height(8.dp))
            OutlinedButton(
                onClick = { capturePhoto() },
                enabled = !busy && mediaUris.size < 6,
                shape = RoundedCornerShape(12.dp),
                border = BorderStroke(1.dp, Line),
                modifier = Modifier.fillMaxWidth(),
            ) {
                Icon(
                    Icons.Outlined.PhotoCamera,
                    contentDescription = null,
                    tint = Forest,
                    modifier = Modifier.size(18.dp),
                )
                Spacer(Modifier.size(8.dp))
                Text(
                    stringResource(R.string.media_take_photo),
                    style = MaterialTheme.typography.labelMedium,
                    color = Forest,
                )
            }

            if (mediaUris.isNotEmpty()) {
                Spacer(Modifier.height(10.dp))
                FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    mediaUris.forEachIndexed { index, uri ->
                        Box(
                            modifier = Modifier
                                .size(82.dp)
                                .background(PaperDeep, RoundedCornerShape(10.dp)),
                        ) {
                            AsyncImage(
                                model = uri,
                                contentDescription = null,
                                contentScale = ContentScale.Crop,
                                modifier = Modifier.fillMaxSize(),
                            )
                            IconButton(
                                onClick = { mediaUris = mediaUris.filterIndexed { i, _ -> i != index } },
                                modifier = Modifier
                                    .align(Alignment.TopEnd)
                                    .size(26.dp)
                                    .background(Forest.copy(alpha = 0.7f), RoundedCornerShape(13.dp)),
                            ) {
                                Icon(
                                    Icons.Outlined.Close,
                                    contentDescription = stringResource(R.string.add_entry_remove_file),
                                    tint = Color.White,
                                    modifier = Modifier.size(14.dp),
                                )
                            }
                        }
                    }
                }
            }

            if (error != null) {
                Spacer(Modifier.height(14.dp))
                Text(error ?: "", style = MaterialTheme.typography.bodySmall, color = Danger)
            }

            Spacer(Modifier.height(104.dp))
            Text(
                stringResource(R.string.add_entry_footer_hint),
                style = MaterialTheme.typography.bodySmall,
                color = Muted,
            )
            Spacer(Modifier.height(16.dp))
        }
        }

        Surface(
            color = Paper,
            shadowElevation = 12.dp,
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .fillMaxWidth(),
        ) {
            Button(
                onClick = {
                    val measurement = if (type == "measurement") {
                        val parsed = value.replace(',', '.').toDoubleOrNull()
                        if (metric.isNotBlank() && unit.isNotBlank() && parsed != null) {
                            MeasurementInput(metric.trim(), parsed, unit.trim())
                        } else {
                            null
                        }
                    } else {
                        null
                    }
                    val occurredAtIso = Instant.ofEpochMilli(occurredAt).toString()
                    val dueAtIso = if (type == "reminder") {
                        Instant.ofEpochMilli(dueAt).toString()
                    } else {
                        null
                    }
                    if (entryId != null) {
                        vm.updateEntry(
                            assetId = assetId,
                            entryId = entryId,
                            type = type,
                            title = title,
                            body = body,
                            visibility = visibility,
                            occurredAt = occurredAtIso,
                            dueAt = dueAtIso,
                            newMediaUris = mediaUris,
                            measurement = measurement,
                            locationName = locationName,
                            latitude = latitude,
                            longitude = longitude,
                            clearLocation = clearLocation,
                            onSaved = onSaved,
                        )
                    } else {
                        vm.addEntry(
                            assetId = assetId,
                            type = type,
                            title = title,
                            body = body,
                            visibility = visibility,
                            occurredAt = occurredAtIso,
                            dueAt = dueAtIso,
                            mediaUris = mediaUris,
                            measurement = measurement,
                            locationName = locationName,
                            latitude = latitude,
                            longitude = longitude,
                            onSaved = onSaved,
                        )
                    }
                },
                enabled = !busy,
                colors = ButtonDefaults.buttonColors(
                    containerColor = Forest,
                    contentColor = Paper,
                ),
                shape = RoundedCornerShape(50),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp)
                    .padding(vertical = 12.dp)
                    .height(52.dp),
            ) {
                if (busy) {
                    CircularProgressIndicator(
                        color = Paper,
                        strokeWidth = 2.dp,
                        modifier = Modifier.size(20.dp),
                    )
                } else {
                    Text(
                        stringResource(
                            if (editing) R.string.edit_entry_save else R.string.add_entry_save,
                        ),
                        style = MaterialTheme.typography.labelLarge,
                    )
                }
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
                    clearLocation = false
                    mapOpen = false
                    // Haritada seçilen nokta kaydedilsin; adres de yeni noktaya göre yazılır.
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
    }
}
