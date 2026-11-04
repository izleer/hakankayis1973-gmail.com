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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.AddPhotoAlternate
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material.icons.outlined.Close
import androidx.compose.material.icons.outlined.Edit
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
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
import app.varlikhafizasi.ui.components.GoldRule
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
import java.time.Instant
import java.util.Calendar

private val entryTypes = listOf(
    "note", "photo", "maintenance", "health", "measurement", "acquisition", "event", "document",
)

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun AddEntryScreen(
    vm: VhViewModel,
    assetId: String,
    onBack: () -> Unit,
    onSaved: () -> Unit,
) {
    val state by vm.detail.collectAsStateWithLifecycle()
    val busy by vm.formBusy.collectAsStateWithLifecycle()
    val error by vm.formError.collectAsStateWithLifecycle()

    var type by rememberSaveable { mutableStateOf("note") }
    var title by rememberSaveable { mutableStateOf("") }
    var body by rememberSaveable { mutableStateOf("") }
    var visibility by rememberSaveable { mutableStateOf("private") }
    var metric by rememberSaveable { mutableStateOf("") }
    var value by rememberSaveable { mutableStateOf("") }
    var unit by rememberSaveable { mutableStateOf("") }
    var mediaUris by remember { mutableStateOf<List<Uri>>(emptyList()) }
    var occurredAt by rememberSaveable { mutableStateOf(System.currentTimeMillis()) }
    val context = LocalContext.current

    fun openOccurredAtPicker() {
        val calendar = Calendar.getInstance().apply { timeInMillis = occurredAt }
        DatePickerDialog(
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
                        occurredAt = calendar.timeInMillis
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

    val asset = state.data?.detail?.asset
    val assetTitle = asset?.title ?: stringResource(R.string.common_asset)
    val assetVisibility = asset?.visibility ?: "private"

    LaunchedEffect(assetId) {
        if (state.data?.detail?.asset?.id != assetId) vm.loadDetail(assetId)
        vm.clearFormError()
    }

    val picker = rememberLauncherForActivityResult(
        ActivityResultContracts.GetMultipleContents(),
    ) { uris ->
        if (uris.isNotEmpty()) {
            mediaUris = (mediaUris + uris).take(6)
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
                title = stringResource(R.string.add_entry_title),
                onBack = onBack,
                subtitle = assetTitle,
            )

        Column(Modifier.padding(horizontal = 20.dp)) {
            Text(
                stringResource(R.string.add_entry_eyebrow),
                style = MaterialTheme.typography.labelSmall,
                color = Clay,
            )
            Spacer(Modifier.height(4.dp))
            Text(
                stringResource(R.string.add_entry_headline),
                style = MaterialTheme.typography.headlineLarge,
                color = Forest,
            )
            Spacer(Modifier.height(10.dp))
            GoldRule()
            Spacer(Modifier.height(12.dp))
            Text(
                stringResource(R.string.add_entry_intro),
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
            val allowed = when (assetVisibility) {
                "public" -> listOf("private", "selected", "public")
                "selected" -> listOf("private", "selected")
                else -> listOf("private")
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
                    vm.addEntry(
                        assetId = assetId,
                        type = type,
                        title = title,
                        body = body,
                        visibility = visibility,
                        occurredAt = Instant.ofEpochMilli(occurredAt).toString(),
                        mediaUris = mediaUris,
                        measurement = measurement,
                        onSaved = onSaved,
                    )
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
                        stringResource(R.string.add_entry_save),
                        style = MaterialTheme.typography.labelLarge,
                    )
                }
            }
        }
    }
}
