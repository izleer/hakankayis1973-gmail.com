package app.varlikhafizasi.ui.screens

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
import androidx.compose.material.icons.outlined.Close
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
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import app.varlikhafizasi.data.MeasurementInput
import app.varlikhafizasi.ui.VhViewModel
import app.varlikhafizasi.ui.components.GoldRule
import app.varlikhafizasi.ui.components.Pill
import app.varlikhafizasi.ui.components.SectionLabel
import app.varlikhafizasi.ui.components.VhTopBar
import app.varlikhafizasi.ui.components.entryTypeLabel
import app.varlikhafizasi.ui.theme.Clay
import app.varlikhafizasi.ui.theme.Danger
import app.varlikhafizasi.ui.theme.Forest
import app.varlikhafizasi.ui.theme.Line
import app.varlikhafizasi.ui.theme.Muted
import app.varlikhafizasi.ui.theme.Paper
import app.varlikhafizasi.ui.theme.PaperDeep
import coil.compose.AsyncImage

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

    val asset = state.data?.detail?.asset
    val assetTitle = asset?.title ?: "Varlık"
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

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Paper)
            .verticalScroll(rememberScrollState())
            .imePadding(),
    ) {
        VhTopBar(
            title = "Kayıt ekle",
            onBack = onBack,
            subtitle = assetTitle,
        )

        Column(Modifier.padding(horizontal = 20.dp)) {
            Text(
                "ZAMAN ÇİZELGESİNE",
                style = MaterialTheme.typography.labelSmall,
                color = Clay,
            )
            Spacer(Modifier.height(4.dp))
            Text(
                "Bugün ne oldu?",
                style = MaterialTheme.typography.headlineLarge,
                color = Forest,
            )
            Spacer(Modifier.height(10.dp))
            GoldRule()
            Spacer(Modifier.height(12.dp))
            Text(
                "Bir bakım, bir an, bir ölçüm… Ne olursa olsun, tarihiyle birlikte kalsın.",
                style = MaterialTheme.typography.bodySmall,
                color = Muted,
            )

            Spacer(Modifier.height(20.dp))
            SectionLabel("Kayıt türü")
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
                label = { Text("Başlık (isteğe bağlı)") },
                singleLine = true,
                enabled = !busy,
                modifier = Modifier.fillMaxWidth(),
            )
            Spacer(Modifier.height(10.dp))
            OutlinedTextField(
                value = body,
                onValueChange = { body = it.take(5000) },
                label = { Text("Notlar") },
                placeholder = { Text("Ne yaptın, ne değişti, ne hissettin?") },
                minLines = 4,
                enabled = !busy,
                modifier = Modifier.fillMaxWidth(),
            )

            if (type == "measurement") {
                Spacer(Modifier.height(16.dp))
                SectionLabel("Ölçüm")
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(
                        value = metric,
                        onValueChange = { metric = it.take(60) },
                        label = { Text("Metrik") },
                        placeholder = { Text("Boy") },
                        singleLine = true,
                        enabled = !busy,
                        modifier = Modifier.weight(1.4f),
                    )
                    OutlinedTextField(
                        value = value,
                        onValueChange = { value = it.take(12) },
                        label = { Text("Değer") },
                        singleLine = true,
                        enabled = !busy,
                        modifier = Modifier.weight(1f),
                    )
                    OutlinedTextField(
                        value = unit,
                        onValueChange = { unit = it.take(20) },
                        label = { Text("Birim") },
                        placeholder = { Text("cm") },
                        singleLine = true,
                        enabled = !busy,
                        modifier = Modifier.weight(1f),
                    )
                }
                Spacer(Modifier.height(4.dp))
                Text(
                    "Doldurursan ölçüm geçmişine eklenir.",
                    style = MaterialTheme.typography.bodySmall,
                    color = Muted,
                )
            }

            Spacer(Modifier.height(18.dp))
            SectionLabel("Kimler görebilir?")
            val allowed = when (assetVisibility) {
                "public" -> listOf("private", "selected", "public")
                "selected" -> listOf("private", "selected")
                else -> listOf("private")
            }
            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                allowed.forEach { option ->
                    Pill(
                        text = when (option) {
                            "public" -> "Herkese açık"
                            "selected" -> "Seçili"
                            else -> "Özel"
                        },
                        selected = visibility == option,
                        onClick = { visibility = option },
                    )
                }
            }
            Text(
                "Kayıt, varlıktan daha geniş görünürlükte olamaz.",
                style = MaterialTheme.typography.bodySmall,
                color = Muted,
                modifier = Modifier.padding(top = 5.dp),
            )

            Spacer(Modifier.height(18.dp))
            SectionLabel("Fotoğraf / belge")
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
                        "Dosya ekle (en fazla 6, 10 MB)",
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
                                    contentDescription = "Kaldır",
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

            Spacer(Modifier.height(22.dp))
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
                        mediaUris = mediaUris,
                        measurement = measurement,
                        onSaved = onSaved,
                    )
                },
                enabled = !busy,
                colors = ButtonDefaults.buttonColors(
                    containerColor = Clay,
                    contentColor = Color.White,
                ),
                shape = RoundedCornerShape(50),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp),
            ) {
                if (busy) {
                    CircularProgressIndicator(
                        color = Color.White,
                        strokeWidth = 2.dp,
                        modifier = Modifier.size(20.dp),
                    )
                } else {
                    Text("Zaman çizelgesine ekle", style = MaterialTheme.typography.labelLarge)
                }
            }

            Spacer(Modifier.height(12.dp))
            Text(
                "Kayıt bugünün tarihiyle eklenir; sonradan düzenleyebilirsin.",
                style = MaterialTheme.typography.bodySmall,
                color = Muted,
            )
            Spacer(Modifier.height(28.dp))
        }
    }
}
