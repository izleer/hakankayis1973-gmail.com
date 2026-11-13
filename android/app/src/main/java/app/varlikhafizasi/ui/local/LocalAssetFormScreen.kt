package app.varlikhafizasi.ui.local

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
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
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.PhotoCamera
import androidx.compose.material.icons.outlined.PhotoLibrary
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
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
import app.varlikhafizasi.ui.components.Pill
import app.varlikhafizasi.ui.components.SectionLabel
import app.varlikhafizasi.ui.components.VhTopBar
import app.varlikhafizasi.ui.theme.Forest
import app.varlikhafizasi.ui.theme.Ivory
import app.varlikhafizasi.ui.theme.Line
import app.varlikhafizasi.ui.theme.Muted
import app.varlikhafizasi.ui.theme.Paper
import app.varlikhafizasi.ui.theme.PaperDeep
import app.varlikhafizasi.ui.theme.TerracottaInk
import coil.compose.AsyncImage
import java.io.File

@Composable
fun LocalAssetFormScreen(
    vm: LocalViewModel,
    assetId: String?,
    onBack: () -> Unit,
    onCreated: (String) -> Unit,
) {
    val editing = assetId != null
    val state by vm.asset.collectAsStateWithLifecycle()
    val context = LocalContext.current

    var title by rememberSaveable(assetId) { mutableStateOf("") }
    var category by rememberSaveable(assetId) { mutableStateOf("Diğer") }
    var description by rememberSaveable(assetId) { mutableStateOf("") }
    var seeded by rememberSaveable(assetId) { mutableStateOf(false) }
    var newCover by remember { mutableStateOf<File?>(null) }
    var pickedUri by remember { mutableStateOf<Uri?>(null) }
    var removeCover by rememberSaveable(assetId) { mutableStateOf(false) }
    var pendingCapture by remember { mutableStateOf<File?>(null) }
    var showError by rememberSaveable(assetId) { mutableStateOf(false) }

    LaunchedEffect(assetId) {
        if (assetId != null) vm.loadAsset(assetId)
    }

    val existing = if (editing) state.data?.asset else null
    LaunchedEffect(existing?.id) {
        val asset = existing ?: return@LaunchedEffect
        if (seeded) return@LaunchedEffect
        title = asset.title
        category = asset.category.ifBlank { "Diğer" }
        description = asset.description.orEmpty()
        seeded = true
    }

    val gallery = rememberLauncherForActivityResult(
        ActivityResultContracts.GetContent(),
    ) { uri ->
        if (uri != null) {
            pickedUri = uri
            newCover = null
            removeCover = false
        }
    }
    val camera = rememberLauncherForActivityResult(
        ActivityResultContracts.TakePicture(),
    ) { saved ->
        val file = pendingCapture
        pendingCapture = null
        if (saved && file != null) {
            newCover = file
            pickedUri = null
            removeCover = false
        } else if (file != null) {
            vm.discardFile(file)
        }
    }

    fun capture() {
        val file = vm.newCaptureFile("kapak")
        pendingCapture = file
        runCatching { camera.launch(vm.captureUri(file)) }
            .onFailure {
                vm.discardFile(file)
                pendingCapture = null
            }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Paper),
    ) {
        VhTopBar(
            title = stringResource(
                if (editing) R.string.local_form_edit_title else R.string.local_form_new_title,
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
            SectionLabel(stringResource(R.string.local_form_cover))
            val coverModel: Any? = when {
                newCover != null -> newCover
                pickedUri != null -> pickedUri
                removeCover -> null
                else -> vm.mediaFile(existing?.coverPath)
            }
            if (coverModel != null) {
                Box {
                    AsyncImage(
                        model = coverModel,
                        contentDescription = null,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(190.dp)
                            .clip(RoundedCornerShape(18.dp)),
                    )
                    Text(
                        stringResource(R.string.local_form_cover_remove),
                        style = MaterialTheme.typography.labelSmall,
                        color = Color.White,
                        modifier = Modifier
                            .align(Alignment.BottomEnd)
                            .padding(10.dp)
                            .background(Forest.copy(alpha = 0.75f), RoundedCornerShape(50))
                            .clickable {
                                newCover = null
                                pickedUri = null
                                removeCover = true
                            }
                            .padding(horizontal = 10.dp, vertical = 6.dp),
                    )
                }
            } else {
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    CoverAction(
                        icon = Icons.Outlined.PhotoCamera,
                        label = stringResource(R.string.local_form_camera),
                        modifier = Modifier.weight(1f),
                        onClick = { capture() },
                    )
                    CoverAction(
                        icon = Icons.Outlined.PhotoLibrary,
                        label = stringResource(R.string.local_form_gallery),
                        modifier = Modifier.weight(1f),
                        onClick = { gallery.launch("image/*") },
                    )
                }
            }

            Spacer(Modifier.height(18.dp))
            OutlinedTextField(
                value = title,
                onValueChange = {
                    title = it
                    if (showError && it.isNotBlank()) showError = false
                },
                label = { Text(stringResource(R.string.local_form_name)) },
                placeholder = { Text(stringResource(R.string.local_form_name_placeholder), color = Muted) },
                singleLine = true,
                isError = showError && title.isBlank(),
                supportingText = if (showError && title.isBlank()) {
                    { Text(stringResource(R.string.local_form_name_required), color = MaterialTheme.colorScheme.error) }
                } else {
                    null
                },
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = Forest,
                    unfocusedBorderColor = Line,
                ),
                modifier = Modifier.fillMaxWidth(),
            )

            Spacer(Modifier.height(14.dp))
            SectionLabel(stringResource(R.string.local_form_category))
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                localCategories.chunked(3).forEach { row ->
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        row.forEach { option ->
                            Pill(
                                text = localCategoryLabel(option),
                                selected = category == option,
                                onClick = { category = option },
                            )
                        }
                    }
                }
            }

            Spacer(Modifier.height(14.dp))
            OutlinedTextField(
                value = description,
                onValueChange = { description = it },
                label = { Text(stringResource(R.string.local_form_description)) },
                placeholder = {
                    Text(stringResource(R.string.local_form_description_placeholder), color = Muted)
                },
                minLines = 3,
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = Forest,
                    unfocusedBorderColor = Line,
                ),
                modifier = Modifier.fillMaxWidth(),
            )

            Spacer(Modifier.height(22.dp))
            Surface(
                color = Forest,
                shape = RoundedCornerShape(50),
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable {
                        if (title.isBlank()) {
                            showError = true
                            return@clickable
                        }
                        if (editing && assetId != null) {
                            vm.updateAsset(
                                id = assetId,
                                title = title,
                                category = category,
                                description = description,
                                newCoverFile = newCover,
                                newCoverUri = pickedUri,
                                removeCover = removeCover,
                                onDone = onBack,
                            )
                        } else {
                            vm.createAsset(
                                title = title,
                                category = category,
                                description = description,
                                coverFile = newCover,
                                coverUri = pickedUri,
                                onDone = onCreated,
                            )
                        }
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
            Spacer(Modifier.height(10.dp))
            TextButton(onClick = onBack, modifier = Modifier.fillMaxWidth()) {
                Text(stringResource(R.string.local_cancel), color = Muted)
            }
            Spacer(Modifier.height(24.dp))
        }
    }
}

@Composable
private fun CoverAction(
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
            modifier = Modifier.padding(vertical = 20.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Icon(icon, contentDescription = null, tint = TerracottaInk, modifier = Modifier.size(24.dp))
            Spacer(Modifier.height(6.dp))
            Text(label, style = MaterialTheme.typography.labelMedium, color = Forest)
        }
    }
}
