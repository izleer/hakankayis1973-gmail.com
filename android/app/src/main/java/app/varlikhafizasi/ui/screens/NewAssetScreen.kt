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
import androidx.compose.material.icons.outlined.ArrowDropDown
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
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
import app.varlikhafizasi.data.AssetType
import app.varlikhafizasi.ui.VhViewModel
import app.varlikhafizasi.ui.components.GoldRule
import app.varlikhafizasi.ui.components.Pill
import app.varlikhafizasi.ui.components.SectionLabel
import app.varlikhafizasi.ui.components.VhTopBar
import app.varlikhafizasi.ui.theme.Clay
import app.varlikhafizasi.ui.theme.Danger
import app.varlikhafizasi.ui.theme.Forest
import app.varlikhafizasi.ui.theme.Line
import app.varlikhafizasi.ui.theme.Muted
import app.varlikhafizasi.ui.theme.Paper
import app.varlikhafizasi.ui.theme.PaperDeep
import app.varlikhafizasi.ui.theme.Sage
import app.varlikhafizasi.ui.theme.Ivory
import coil.compose.AsyncImage

private data class TypeOption(val id: String, val label: String, val parent: String?)

private fun flattenTypes(types: List<AssetType>): List<TypeOption> =
    types.flatMap { root ->
        if (root.children.isEmpty()) {
            listOf(TypeOption(root.id, root.label, null))
        } else {
            root.children.map { child -> TypeOption(child.id, child.label, root.label) }
        }
    }

@Composable
fun NewAssetScreen(
    vm: VhViewModel,
    onBack: () -> Unit,
    onCreated: (String) -> Unit,
) {
    val types by vm.assetTypes.collectAsStateWithLifecycle()
    val busy by vm.formBusy.collectAsStateWithLifecycle()
    val error by vm.formError.collectAsStateWithLifecycle()

    var title by rememberSaveable { mutableStateOf("") }
    var description by rememberSaveable { mutableStateOf("") }
    var visibility by rememberSaveable { mutableStateOf("private") }
    var selectedId by rememberSaveable { mutableStateOf<String?>(null) }
    var menuOpen by rememberSaveable { mutableStateOf(false) }
    var coverUri by remember { mutableStateOf<Uri?>(null) }

    val options = remember(types) { flattenTypes(types) }
    val selected = options.firstOrNull { it.id == selectedId }

    LaunchedEffect(Unit) {
        vm.ensureAssetTypes()
        vm.clearFormError()
    }

    val picker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        if (uri != null) coverUri = uri
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Paper)
            .verticalScroll(rememberScrollState())
            .imePadding(),
    ) {
        VhTopBar(title = "Yeni varlık", onBack = onBack)

        Column(Modifier.padding(horizontal = 20.dp)) {
            Text(
                "HAFIZAYA YENİ BİR İZ",
                style = MaterialTheme.typography.labelSmall,
                color = Clay,
            )
            Spacer(Modifier.height(4.dp))
            Text(
                "Adını koy,\nilkini paylaş.",
                style = MaterialTheme.typography.displayMedium,
                color = Forest,
            )
            Spacer(Modifier.height(12.dp))
            GoldRule()
            Spacer(Modifier.height(12.dp))
            Text(
                "Bir canlı, bir eser, bir mekân… İlk fotoğrafını ekle ve hikâyesini başlat.",
                style = MaterialTheme.typography.bodyMedium,
                color = Muted,
            )

            Spacer(Modifier.height(22.dp))
            SectionLabel("Varlık türü")
            Box {
                OutlinedButton(
                    onClick = { menuOpen = true },
                    shape = RoundedCornerShape(12.dp),
                    border = BorderStroke(1.dp, Line),
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text(
                        text = selected?.let {
                            if (it.parent != null) "${it.parent} · ${it.label}" else it.label
                        } ?: "Bir tür seçin",
                        color = if (selected != null) Forest else Muted,
                        style = MaterialTheme.typography.bodyMedium,
                        modifier = Modifier.weight(1f),
                    )
                    Icon(Icons.Outlined.ArrowDropDown, contentDescription = null, tint = Muted)
                }
                DropdownMenu(
                    expanded = menuOpen,
                    onDismissRequest = { menuOpen = false },
                    modifier = Modifier.background(Ivory),
                ) {
                    options.forEach { option ->
                        DropdownMenuItem(
                            text = {
                                Column {
                                    Text(option.label, color = Forest)
                                    if (option.parent != null) {
                                        Text(
                                            option.parent,
                                            style = MaterialTheme.typography.bodySmall,
                                            color = Muted,
                                        )
                                    }
                                }
                            },
                            onClick = {
                                selectedId = option.id
                                menuOpen = false
                            },
                        )
                    }
                }
            }

            Spacer(Modifier.height(16.dp))
            OutlinedTextField(
                value = title,
                onValueChange = { title = it.take(120) },
                label = { Text("Varlığın adı") },
                placeholder = { Text("Örn. Bonzai · Ada'nın çamı") },
                singleLine = true,
                enabled = !busy,
                modifier = Modifier.fillMaxWidth(),
            )

            Spacer(Modifier.height(12.dp))
            OutlinedTextField(
                value = description,
                onValueChange = { description = it.take(2000) },
                label = { Text("Kısa açıklama (isteğe bağlı)") },
                minLines = 3,
                enabled = !busy,
                modifier = Modifier.fillMaxWidth(),
            )

            Spacer(Modifier.height(20.dp))
            SectionLabel("Kimler görebilir?")
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Pill("Özel", visibility == "private", onClick = { visibility = "private" })
                Pill("Seçili", visibility == "selected", onClick = { visibility = "selected" })
                Pill("Herkese açık", visibility == "public", onClick = { visibility = "public" })
            }
            Spacer(Modifier.height(6.dp))
            Text(
                text = when (visibility) {
                    "public" -> "Keşfet akışında görünür. Sonradan değiştirebilirsin."
                    "selected" -> "Yalnızca paylaştığın kişiler görebilir."
                    else -> "Yalnızca sen görürsün. Varsayılan budur."
                },
                style = MaterialTheme.typography.bodySmall,
                color = Muted,
            )

            Spacer(Modifier.height(20.dp))
            SectionLabel("Kapak fotoğrafı")
            Surface(
                color = PaperDeep,
                shape = RoundedCornerShape(16.dp),
                border = BorderStroke(1.dp, Line),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(190.dp)
                    .clickable { picker.launch("image/*") },
            ) {
                if (coverUri != null) {
                    Box(Modifier.fillMaxSize()) {
                        AsyncImage(
                            model = coverUri,
                            contentDescription = "Kapak önizleme",
                            contentScale = ContentScale.Crop,
                            modifier = Modifier.fillMaxSize(),
                        )
                        Text(
                            "Değiştir",
                            style = MaterialTheme.typography.labelSmall,
                            color = Color.White,
                            modifier = Modifier
                                .align(Alignment.BottomEnd)
                                .background(Forest.copy(alpha = 0.75f), RoundedCornerShape(4.dp))
                                .padding(horizontal = 8.dp, vertical = 5.dp)
                                .padding(end = 2.dp),
                        )
                    }
                } else {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center,
                        modifier = Modifier.fillMaxSize(),
                    ) {
                        Icon(
                            Icons.Outlined.AddPhotoAlternate,
                            contentDescription = null,
                            tint = Sage,
                        )
                        Spacer(Modifier.height(6.dp))
                        Text(
                            "Galeriden bir fotoğraf seç",
                            style = MaterialTheme.typography.bodySmall,
                            color = Muted,
                        )
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
                    val typeId = selectedId
                    if (typeId == null) {
                        vm.setNotice("Önce bir varlık türü seçin.")
                        return@Button
                    }
                    vm.createAsset(
                        typeId = typeId,
                        title = title,
                        description = description,
                        visibility = visibility,
                        coverUri = coverUri,
                        onCreated = onCreated,
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
                    .height(52.dp),
            ) {
                if (busy) {
                    CircularProgressIndicator(
                        color = Paper,
                        strokeWidth = 2.dp,
                        modifier = Modifier.size(20.dp),
                    )
                } else {
                    Text("Hafızaya ekle", style = MaterialTheme.typography.labelLarge)
                }
            }
            Spacer(Modifier.height(28.dp))
        }
    }
}
