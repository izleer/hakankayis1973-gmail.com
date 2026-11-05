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
import androidx.compose.material.icons.outlined.PhotoCamera
import androidx.compose.material.icons.outlined.PhotoLibrary
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
import androidx.compose.runtime.saveable.Saver
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import app.varlikhafizasi.R
import app.varlikhafizasi.data.AssetType
import app.varlikhafizasi.ui.VhViewModel
import app.varlikhafizasi.ui.components.GoldRule
import app.varlikhafizasi.ui.components.LocationPicker
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
import app.varlikhafizasi.ui.theme.SageInk
import app.varlikhafizasi.ui.theme.Ivory
import coil.compose.AsyncImage

private data class TypeOption(val id: String, val label: String, val parent: String?)

private val UriStateSaver = Saver<Uri?, String>(
    save = { it?.toString().orEmpty() },
    restore = { value -> value.takeIf { it.isNotEmpty() }?.let(Uri::parse) },
)

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
    var coverUri by rememberSaveable(stateSaver = UriStateSaver) { mutableStateOf<Uri?>(null) }
    var pendingCoverUri by rememberSaveable(stateSaver = UriStateSaver) { mutableStateOf<Uri?>(null) }
    var locationName by rememberSaveable { mutableStateOf("") }
    var latitude by rememberSaveable { mutableStateOf<Double?>(null) }
    var longitude by rememberSaveable { mutableStateOf<Double?>(null) }
    val context = LocalContext.current
    val cameraUnavailable = stringResource(R.string.media_camera_unavailable)

    val options = remember(types) { flattenTypes(types) }
    val selected = options.firstOrNull { it.id == selectedId }
    val typeRequiredNotice = stringResource(R.string.assets_error_type_required)

    LaunchedEffect(Unit) {
        vm.ensureAssetTypes()
        vm.clearFormError()
    }

    val picker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        if (uri != null) coverUri = uri
    }

    val camera = rememberLauncherForActivityResult(ActivityResultContracts.TakePicture()) { saved ->
        val captured = pendingCoverUri
        pendingCoverUri = null
        if (saved && captured != null) coverUri = captured
    }

    fun captureCover() {
        val target = runCatching { createCaptureUri(context, "cover") }.getOrElse {
            vm.setNotice(cameraUnavailable)
            return
        }
        pendingCoverUri = target
        runCatching { camera.launch(target) }.onFailure {
            pendingCoverUri = null
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
            VhTopBar(title = stringResource(R.string.assets_new_title), onBack = onBack)

        Column(Modifier.padding(horizontal = 20.dp)) {
            Text(
                stringResource(R.string.assets_new_kicker),
                style = MaterialTheme.typography.labelSmall,
                color = Clay,
            )
            Spacer(Modifier.height(4.dp))
            Text(
                stringResource(R.string.assets_new_headline),
                style = MaterialTheme.typography.displayMedium,
                color = Forest,
            )
            Spacer(Modifier.height(12.dp))
            GoldRule()
            Spacer(Modifier.height(12.dp))
            Text(
                stringResource(R.string.assets_new_body),
                style = MaterialTheme.typography.bodyMedium,
                color = Muted,
            )

            Spacer(Modifier.height(22.dp))
            SectionLabel(stringResource(R.string.assets_type_label))
            Box {
                OutlinedButton(
                    onClick = { menuOpen = true },
                    shape = RoundedCornerShape(12.dp),
                    border = BorderStroke(1.dp, Line),
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text(
                        text = selected?.let {
                            if (it.parent != null) {
                                stringResource(R.string.assets_type_parent_format, it.parent, it.label)
                            } else {
                                it.label
                            }
                        } ?: stringResource(R.string.assets_type_placeholder),
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
                label = { Text(stringResource(R.string.assets_name_label)) },
                placeholder = { Text(stringResource(R.string.assets_name_placeholder)) },
                singleLine = true,
                enabled = !busy,
                modifier = Modifier.fillMaxWidth(),
            )

            Spacer(Modifier.height(12.dp))
            OutlinedTextField(
                value = description,
                onValueChange = { description = it.take(2000) },
                label = { Text(stringResource(R.string.assets_description_label)) },
                minLines = 3,
                enabled = !busy,
                modifier = Modifier.fillMaxWidth(),
            )

            Spacer(Modifier.height(20.dp))
            SectionLabel(stringResource(R.string.assets_visibility_label))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Pill(
                    stringResource(R.string.visibility_private),
                    visibility == "private",
                    onClick = { visibility = "private" },
                )
                Pill(
                    stringResource(R.string.assets_visibility_selected_short),
                    visibility == "selected",
                    onClick = { visibility = "selected" },
                )
                Pill(
                    stringResource(R.string.visibility_public),
                    visibility == "public",
                    onClick = { visibility = "public" },
                )
            }
            Spacer(Modifier.height(6.dp))
            Text(
                text = when (visibility) {
                    "public" -> stringResource(R.string.assets_visibility_public_hint)
                    "selected" -> stringResource(R.string.assets_visibility_selected_hint)
                    else -> stringResource(R.string.assets_visibility_private_hint)
                },
                style = MaterialTheme.typography.bodySmall,
                color = Muted,
            )

            Spacer(Modifier.height(20.dp))
            LocationPicker(
                locationName = locationName,
                onLocationNameChange = { locationName = it },
                latitude = latitude,
                longitude = longitude,
                onLocationPicked = { picked ->
                    latitude = picked.latitude
                    longitude = picked.longitude
                    if (locationName.isBlank() && !picked.name.isNullOrBlank()) {
                        locationName = picked.name
                    }
                },
                enabled = !busy,
            )

            Spacer(Modifier.height(20.dp))
            SectionLabel(stringResource(R.string.assets_cover_label))
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
                            contentDescription = stringResource(R.string.assets_cover_preview),
                            contentScale = ContentScale.Crop,
                            modifier = Modifier.fillMaxSize(),
                        )
                        Text(
                            stringResource(R.string.assets_cover_change),
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
                            tint = SageInk,
                        )
                        Spacer(Modifier.height(6.dp))
                        Text(
                            stringResource(R.string.assets_cover_pick),
                            style = MaterialTheme.typography.bodySmall,
                            color = Muted,
                        )
                    }
                }
            }

            Spacer(Modifier.height(8.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedButton(
                    onClick = { picker.launch("image/*") },
                    enabled = !busy,
                    shape = RoundedCornerShape(12.dp),
                    border = BorderStroke(1.dp, Line),
                    modifier = Modifier.weight(1f),
                ) {
                    Icon(
                        Icons.Outlined.PhotoLibrary,
                        contentDescription = null,
                        tint = Forest,
                        modifier = Modifier.size(18.dp),
                    )
                    Spacer(Modifier.size(6.dp))
                    Text(
                        stringResource(R.string.media_pick_gallery),
                        style = MaterialTheme.typography.labelMedium,
                        color = Forest,
                    )
                }
                OutlinedButton(
                    onClick = { captureCover() },
                    enabled = !busy,
                    shape = RoundedCornerShape(12.dp),
                    border = BorderStroke(1.dp, Line),
                    modifier = Modifier.weight(1f),
                ) {
                    Icon(
                        Icons.Outlined.PhotoCamera,
                        contentDescription = null,
                        tint = Forest,
                        modifier = Modifier.size(18.dp),
                    )
                    Spacer(Modifier.size(6.dp))
                    Text(
                        stringResource(R.string.media_take_photo),
                        style = MaterialTheme.typography.labelMedium,
                        color = Forest,
                    )
                }
            }

            if (error != null) {
                Spacer(Modifier.height(14.dp))
                Text(error ?: "", style = MaterialTheme.typography.bodySmall, color = Danger)
            }

            Spacer(Modifier.height(104.dp))
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
                    val typeId = selectedId
                    if (typeId == null) {
                        vm.setNotice(typeRequiredNotice)
                        return@Button
                    }
                    vm.createAsset(
                        typeId = typeId,
                        title = title,
                        description = description,
                        visibility = visibility,
                        coverUri = coverUri,
                        locationName = locationName,
                        latitude = latitude,
                        longitude = longitude,
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
                    Text(stringResource(R.string.assets_submit), style = MaterialTheme.typography.labelLarge)
                }
            }
        }
    }
}
