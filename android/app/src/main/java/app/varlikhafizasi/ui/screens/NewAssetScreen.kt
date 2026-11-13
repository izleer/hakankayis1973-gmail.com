package app.varlikhafizasi.ui.screens

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Add
import androidx.compose.material.icons.outlined.AddPhotoAlternate
import androidx.compose.material.icons.outlined.ArrowDropDown
import androidx.compose.material.icons.outlined.Check
import androidx.compose.material.icons.outlined.Close
import androidx.compose.material.icons.outlined.PhotoCamera
import androidx.compose.material.icons.outlined.PhotoLibrary
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.Saver
import androidx.compose.runtime.saveable.listSaver
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.layout.onGloballyPositioned
import androidx.compose.ui.layout.positionInParent
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import app.varlikhafizasi.R
import app.varlikhafizasi.data.AssetType
import app.varlikhafizasi.data.CategoryTemplate
import app.varlikhafizasi.data.CustomField
import app.varlikhafizasi.data.MediaUrl
import app.varlikhafizasi.data.UserMini
import app.varlikhafizasi.ui.VhViewModel
import app.varlikhafizasi.ui.components.Avatar
import app.varlikhafizasi.ui.components.ErrorBox
import app.varlikhafizasi.ui.components.GoldRule
import app.varlikhafizasi.ui.components.LoadingBox
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
import app.varlikhafizasi.ui.theme.SageLight
import app.varlikhafizasi.ui.theme.Ivory
import coil.compose.AsyncImage
import kotlinx.coroutines.delay
import kotlinx.serialization.json.JsonPrimitive
import kotlin.math.roundToInt

private data class TypeOption(
    val id: String,
    val label: String,
    val path: List<String>,
    val template: CategoryTemplate,
)

private val UriStateSaver = Saver<Uri?, String>(
    save = { it?.toString().orEmpty() },
    restore = { value -> value.takeIf { it.isNotEmpty() }?.let(Uri::parse) },
)

private val ViewerIdsSaver = Saver<List<String>, String>(
    save = { ids -> ids.joinToString(",") },
    restore = { value -> value.split(",").filter { it.isNotBlank() } },
)

private val AttributesSaver = listSaver<Map<String, String>, String>(
    save = { values -> values.entries.flatMap { entry -> listOf(entry.key, entry.value) } },
    restore = { flat ->
        flat.chunked(2).filter { it.size == 2 }.associate { it[0] to it[1] }
    },
)

private val CustomFieldsSaver = listSaver<List<CustomField>, String>(
    save = { fields ->
        fields.flatMap { field -> listOf(field.key, field.label, field.type, field.value.orEmpty()) }
    },
    restore = { flat ->
        flat.chunked(4).filter { it.size == 4 }.map { parts ->
            CustomField(
                key = parts[0],
                label = parts[1],
                type = parts[2].ifBlank { "text" },
                value = parts[3].ifBlank { null },
            )
        }
    },
)

private fun collectTypes(
    types: List<AssetType>,
    path: List<String> = emptyList(),
): List<TypeOption> =
    types.flatMap { type ->
        val self = if (type.isSelectable || type.children.isEmpty()) {
            listOf(TypeOption(type.id, type.label, path, type.attributesSchema))
        } else {
            emptyList()
        }
        self + collectTypes(type.children, path + type.label)
    }

private fun slugifyKey(label: String): String {
    val map = mapOf(
        'ç' to "c", 'ğ' to "g", 'ı' to "i", 'ö' to "o", 'ş' to "s", 'ü' to "u",
        'â' to "a", 'î' to "i", 'û' to "u",
    )
    return label.lowercase()
        .map { map[it] ?: it.toString() }
        .joinToString("")
        .replace(Regex("[^a-z0-9]+"), "_")
        .trim('_')
        .take(40)
}

private fun prepareCustomFields(fields: List<CustomField>): List<CustomField> {
    val used = mutableSetOf<String>()
    return fields.mapIndexedNotNull { index, field ->
        val label = field.label.trim()
        val value = field.value?.trim().orEmpty()
        if (label.isEmpty() || value.isEmpty()) return@mapIndexedNotNull null
        val base = field.key.trim().ifEmpty { slugifyKey(label).ifEmpty { "ozel_alan_${index + 1}" } }
        var key = base
        var suffix = 2
        while (used.contains(key)) {
            key = "${base}_$suffix"
            suffix += 1
        }
        used.add(key)
        CustomField(key = key, label = label, type = field.type, value = value)
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun NewAssetScreen(
    vm: VhViewModel,
    assetId: String? = null,
    onBack: () -> Unit,
    onCreated: (String) -> Unit,
) {
    val types by vm.assetTypes.collectAsStateWithLifecycle()
    val assetState by vm.assetDraft.collectAsStateWithLifecycle()
    val draftAccess by vm.assetDraftAccess.collectAsStateWithLifecycle()
    val assetViewers by vm.assetViewers.collectAsStateWithLifecycle()
    val pickerFriends by vm.pickerFriends.collectAsStateWithLifecycle()
    val busy by vm.formBusy.collectAsStateWithLifecycle()
    val error by vm.formError.collectAsStateWithLifecycle()

    val editing = assetId != null
    val draft = if (editing) assetState.data else null
    // Kişi listesi ve görünürlüğe bağlı kişi seçimi yalnızca varlık sahibine aittir.
    val canManageViewers = !editing || draftAccess.isOwner

    var title by rememberSaveable { mutableStateOf("") }
    var description by rememberSaveable { mutableStateOf("") }
    var visibility by rememberSaveable { mutableStateOf("private") }
    var viewerIds by rememberSaveable(assetId, stateSaver = ViewerIdsSaver) {
        mutableStateOf(emptyList<String>())
    }
    var selectedId by rememberSaveable { mutableStateOf<String?>(null) }
    var attributes by rememberSaveable(assetId, stateSaver = AttributesSaver) {
        mutableStateOf<Map<String, String>>(emptyMap())
    }
    var customFields by rememberSaveable(assetId, stateSaver = CustomFieldsSaver) {
        mutableStateOf<List<CustomField>>(emptyList())
    }
    var menuOpen by rememberSaveable { mutableStateOf(false) }
    var coverUri by rememberSaveable(stateSaver = UriStateSaver) { mutableStateOf<Uri?>(null) }
    var pendingCoverUri by rememberSaveable(stateSaver = UriStateSaver) { mutableStateOf<Uri?>(null) }
    var locationName by rememberSaveable { mutableStateOf("") }
    var latitude by rememberSaveable { mutableStateOf<Double?>(null) }
    var longitude by rememberSaveable { mutableStateOf<Double?>(null) }
    var clearLocation by rememberSaveable { mutableStateOf(false) }
    var seeded by rememberSaveable(assetId) { mutableStateOf(false) }
    var attempted by rememberSaveable { mutableStateOf(false) }
    val scrollState = rememberScrollState()
    var viewersCardTop by remember { mutableStateOf(0) }
    var visibilityPickedByUser by rememberSaveable { mutableStateOf(false) }
    val context = LocalContext.current
    val cameraUnavailable = stringResource(R.string.media_camera_unavailable)
    val scrollTopPadding = with(LocalDensity.current) { 16.dp.roundToPx() }

    val options = remember(types) { collectTypes(types) }
    val selected = options.firstOrNull { it.id == selectedId }
    val templateFields = selected?.template?.fields.orEmpty()
    val typeRequiredNotice = stringResource(R.string.assets_error_type_required)
    val nameRequiredNotice = stringResource(R.string.assets_error_name_required)
    val viewersRequiredNotice = stringResource(R.string.error_asset_viewers_required)
    val typeError = attempted && selectedId == null
    val nameError = attempted && title.isBlank()
    val viewersError = attempted && canManageViewers &&
        visibility == "selected" && viewerIds.isEmpty()

    val viewerOptions = remember(pickerFriends.data, assetViewers) {
        val seen = mutableSetOf<String>()
        val merged = buildList {
            addAll(assetViewers.map { it.user })
            addAll(
                pickerFriends.data.orEmpty().map {
                    UserMini(it.id, it.username, it.displayName, it.avatarUrl)
                },
            )
        }
        merged.filter { seen.add(it.id) }.sortedBy { it.displayName.lowercase() }
    }

    LaunchedEffect(assetId) {
        vm.ensureAssetTypes()
        vm.clearFormError()
        if (assetId != null) vm.loadAssetDraft(assetId) else vm.clearAssetDraft()
    }

    LaunchedEffect(visibility, canManageViewers) {
        if (visibility == "selected" && canManageViewers) {
            vm.loadPickerFriends()
        }
    }

    // Liste ancak arkadaşlar yüklendikten sonra gerçek yüksekliğine kavuşur;
    // kullanıcı görünürlüğü elle seçtiğinde kartı üstten görünür alana kaydır.
    LaunchedEffect(visibility, pickerFriends.data, viewersCardTop) {
        if (visibility == "selected" && visibilityPickedByUser && viewersCardTop > 0) {
            delay(120)
            scrollState.animateScrollTo(
                (viewersCardTop - scrollTopPadding).coerceAtLeast(0),
            )
        }
    }

    // Kaydet'e basıldığında ilk hatalı alanı görünür alana getir.
    LaunchedEffect(attempted, typeError, nameError, viewersError) {
        if (!attempted) return@LaunchedEffect
        when {
            typeError || nameError -> scrollState.animateScrollTo(0)
            viewersError && viewersCardTop > 0 -> scrollState.animateScrollTo(
                (viewersCardTop - scrollTopPadding).coerceAtLeast(0),
            )
        }
    }

    // Ekrandan çıkarken taslağı bırak; aynı varlığı yeniden düzenlerken
    // önceki oturumun eski alanlarıyla dolmasını engeller.
    DisposableEffect(assetId) {
        onDispose {
            if (editing) vm.clearAssetDraft()
        }
    }

    // Düzenlemede alanları mevcut varlıktan bir kez doldur.
    LaunchedEffect(draft?.id) {
        val asset = draft ?: return@LaunchedEffect
        if (seeded) return@LaunchedEffect
        selectedId = asset.type?.id
        title = asset.title
        description = asset.description.orEmpty()
        visibility = asset.visibility
        viewerIds = assetViewers.map { it.user.id }
        locationName = asset.locationName.orEmpty()
        latitude = asset.latitude
        longitude = asset.longitude
        attributes = asset.attributes.entries.mapNotNull { (key, json) ->
            (json as? JsonPrimitive)?.content?.takeIf { it.isNotBlank() }?.let { key to it }
        }.toMap()
        customFields = asset.customFields.map { it.copy(value = it.value.orEmpty()) }
        clearLocation = false
        seeded = true
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
                .verticalScroll(scrollState)
                .imePadding(),
        ) {
            VhTopBar(
                title = stringResource(
                    if (editing) R.string.edit_asset_title else R.string.assets_new_title,
                ),
                onBack = onBack,
            )

            if (editing && assetState.loading) {
                LoadingBox()
            }
            if (editing && assetState.error != null) {
                Box(Modifier.padding(horizontal = 20.dp, vertical = 8.dp)) {
                    ErrorBox(
                        assetState.error ?: "",
                        onRetry = { assetId?.let(vm::loadAssetDraft) },
                    )
                }
            }

        Column(Modifier.padding(horizontal = 20.dp)) {
            Text(
                stringResource(
                    if (editing) R.string.edit_asset_kicker else R.string.assets_new_kicker,
                ),
                style = MaterialTheme.typography.labelSmall,
                color = Clay,
            )
            Spacer(Modifier.height(4.dp))
            Text(
                stringResource(
                    if (editing) R.string.edit_asset_headline else R.string.assets_new_headline,
                ),
                style = MaterialTheme.typography.displayMedium,
                color = Forest,
            )
            Spacer(Modifier.height(12.dp))
            GoldRule()
            Spacer(Modifier.height(12.dp))
            Text(
                stringResource(
                    if (editing) R.string.edit_asset_intro else R.string.assets_new_body,
                ),
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
                        text = selected?.let { option ->
                            val path = option.path.joinToString(" · ")
                            if (path.isNotEmpty()) {
                                stringResource(R.string.assets_type_parent_format, path, option.label)
                            } else {
                                option.label
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
                                    if (option.path.isNotEmpty()) {
                                        Text(
                                            option.path.joinToString(" · "),
                                            style = MaterialTheme.typography.bodySmall,
                                            color = Muted,
                                        )
                                    }
                                }
                            },
                            onClick = {
                                if (selectedId != option.id) attributes = emptyMap()
                                selectedId = option.id
                                menuOpen = false
                            },
                        )
                    }
                }
            }
            if (typeError) {
                Text(
                    typeRequiredNotice,
                    style = MaterialTheme.typography.bodySmall,
                    color = Danger,
                    modifier = Modifier.padding(start = 4.dp, top = 4.dp),
                )
            }

            Spacer(Modifier.height(16.dp))
            OutlinedTextField(
                value = title,
                onValueChange = { title = it.take(120) },
                label = { Text(stringResource(R.string.assets_name_label)) },
                placeholder = { Text(stringResource(R.string.assets_name_placeholder)) },
                singleLine = true,
                enabled = !busy,
                isError = nameError,
                modifier = Modifier.fillMaxWidth(),
            )
            if (nameError) {
                Text(
                    nameRequiredNotice,
                    style = MaterialTheme.typography.bodySmall,
                    color = Danger,
                    modifier = Modifier.padding(start = 16.dp, top = 4.dp),
                )
            }

            Spacer(Modifier.height(12.dp))
            OutlinedTextField(
                value = description,
                onValueChange = { description = it.take(2000) },
                label = { Text(stringResource(R.string.assets_description_label)) },
                minLines = 3,
                enabled = !busy,
                modifier = Modifier.fillMaxWidth(),
            )

            if (templateFields.isNotEmpty()) {
                Spacer(Modifier.height(18.dp))
                SectionLabel(stringResource(R.string.assets_template_fields))
                Text(
                    stringResource(R.string.assets_template_fields_hint),
                    style = MaterialTheme.typography.bodySmall,
                    color = Muted,
                    modifier = Modifier.padding(bottom = 8.dp),
                )
                templateFields.forEach { field ->
                    val label = if (field.unit.isNullOrBlank()) {
                        field.label
                    } else {
                        stringResource(R.string.assets_field_with_unit, field.label, field.unit)
                    }
                    if (field.type == "select" && field.options.isNotEmpty()) {
                        Text(
                            label,
                            style = MaterialTheme.typography.labelMedium,
                            color = Forest,
                            modifier = Modifier.padding(bottom = 6.dp),
                        )
                        FlowRow(
                            horizontalArrangement = Arrangement.spacedBy(7.dp),
                            verticalArrangement = Arrangement.spacedBy(7.dp),
                        ) {
                            field.options.forEach { option ->
                                Pill(
                                    text = option,
                                    selected = attributes[field.key] == option,
                                    onClick = {
                                        attributes = attributes + (field.key to option)
                                    },
                                )
                            }
                        }
                    } else {
                        OutlinedTextField(
                            value = attributes[field.key].orEmpty(),
                            onValueChange = { value ->
                                attributes = attributes + (field.key to value.take(500))
                            },
                            label = { Text(label) },
                            singleLine = true,
                            enabled = !busy,
                            modifier = Modifier.fillMaxWidth(),
                        )
                    }
                    Spacer(Modifier.height(10.dp))
                }
            }

            Spacer(Modifier.height(8.dp))
            SectionLabel(stringResource(R.string.assets_custom_fields))
            Text(
                stringResource(R.string.assets_custom_fields_hint),
                style = MaterialTheme.typography.bodySmall,
                color = Muted,
                modifier = Modifier.padding(bottom = 8.dp),
            )
            customFields.forEachIndexed { index, field ->
                Surface(
                    color = PaperDeep,
                    shape = RoundedCornerShape(14.dp),
                    border = BorderStroke(1.dp, Line),
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(bottom = 8.dp),
                ) {
                    Column(Modifier.padding(12.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            OutlinedTextField(
                                value = field.label,
                                onValueChange = { value ->
                                    customFields = customFields.toMutableList().also {
                                        it[index] = field.copy(label = value.take(80))
                                    }
                                },
                                label = { Text(stringResource(R.string.assets_custom_field_name)) },
                                singleLine = true,
                                enabled = !busy,
                                modifier = Modifier.weight(1f),
                            )
                            IconButton(
                                onClick = {
                                    customFields = customFields.filterIndexed { current, _ ->
                                        current != index
                                    }
                                },
                                enabled = !busy,
                            ) {
                                Icon(
                                    Icons.Outlined.Close,
                                    contentDescription = stringResource(
                                        R.string.assets_custom_field_remove,
                                    ),
                                    tint = Muted,
                                )
                            }
                        }
                        Text(
                            stringResource(R.string.assets_custom_field_type_label),
                            style = MaterialTheme.typography.labelSmall,
                            color = Muted,
                            modifier = Modifier.padding(top = 6.dp, bottom = 4.dp),
                        )
                        FlowRow(horizontalArrangement = Arrangement.spacedBy(7.dp)) {
                            listOf("text", "number", "date").forEach { typeKey ->
                                Pill(
                                    text = stringResource(
                                        when (typeKey) {
                                            "number" -> R.string.assets_custom_field_type_number
                                            "date" -> R.string.assets_custom_field_type_date
                                            else -> R.string.assets_custom_field_type_text
                                        },
                                    ),
                                    selected = field.type == typeKey,
                                    onClick = {
                                        customFields = customFields.toMutableList().also {
                                            it[index] = field.copy(type = typeKey)
                                        }
                                    },
                                )
                            }
                        }
                        Spacer(Modifier.height(8.dp))
                        OutlinedTextField(
                            value = field.value.orEmpty(),
                            onValueChange = { value ->
                                customFields = customFields.toMutableList().also {
                                    it[index] = field.copy(value = value.take(500))
                                }
                            },
                            label = { Text(stringResource(R.string.assets_custom_field_value)) },
                            singleLine = true,
                            enabled = !busy,
                            modifier = Modifier.fillMaxWidth(),
                        )
                    }
                }
            }
            OutlinedButton(
                onClick = { customFields = customFields + CustomField() },
                enabled = !busy && customFields.size < 30,
                shape = RoundedCornerShape(12.dp),
                border = BorderStroke(1.dp, Line),
            ) {
                Icon(
                    Icons.Outlined.Add,
                    contentDescription = null,
                    tint = Forest,
                    modifier = Modifier.size(16.dp),
                )
                Spacer(Modifier.size(6.dp))
                Text(
                    stringResource(R.string.assets_custom_field_add),
                    style = MaterialTheme.typography.labelMedium,
                    color = Forest,
                )
            }

            Spacer(Modifier.height(20.dp))
            SectionLabel(stringResource(R.string.assets_visibility_label))
            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Pill(
                    stringResource(R.string.visibility_private),
                    visibility == "private",
                    onClick = {
                        visibilityPickedByUser = true
                        visibility = "private"
                    },
                )
                Pill(
                    stringResource(R.string.assets_visibility_selected_short),
                    visibility == "selected",
                    onClick = {
                        visibilityPickedByUser = true
                        visibility = "selected"
                    },
                )
                Pill(
                    stringResource(R.string.visibility_friends),
                    visibility == "friends",
                    onClick = {
                        visibilityPickedByUser = true
                        visibility = "friends"
                    },
                )
                Pill(
                    stringResource(R.string.visibility_public),
                    visibility == "public",
                    onClick = {
                        visibilityPickedByUser = true
                        visibility = "public"
                    },
                )
            }
            Spacer(Modifier.height(6.dp))
            Text(
                text = when (visibility) {
                    "public" -> stringResource(R.string.assets_visibility_public_hint)
                    "friends" -> stringResource(R.string.assets_visibility_friends_hint)
                    "selected" -> stringResource(R.string.assets_visibility_selected_hint)
                    else -> stringResource(R.string.assets_visibility_private_hint)
                },
                style = MaterialTheme.typography.bodySmall,
                color = Muted,
            )

            if (visibility == "selected" && canManageViewers) {
                Spacer(Modifier.height(12.dp))
                Surface(
                    color = PaperDeep,
                    shape = RoundedCornerShape(16.dp),
                    border = BorderStroke(1.dp, Line),
                    modifier = Modifier
                        .fillMaxWidth()
                        .onGloballyPositioned { coordinates ->
                            viewersCardTop = coordinates.positionInParent().y.roundToInt()
                        },
                ) {
                    Column(Modifier.padding(14.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(
                                stringResource(R.string.assets_viewers_title),
                                style = MaterialTheme.typography.labelLarge,
                                color = Forest,
                                modifier = Modifier.weight(1f),
                            )
                            Text(
                                stringResource(
                                    R.string.assets_viewers_count,
                                    viewerIds.size,
                                ),
                                style = MaterialTheme.typography.labelSmall,
                                color = SageInk,
                            )
                        }
                        Spacer(Modifier.height(2.dp))
                        Text(
                            stringResource(R.string.assets_viewers_hint),
                            style = MaterialTheme.typography.bodySmall,
                            color = Muted,
                        )
                        Spacer(Modifier.height(10.dp))
                        when {
                            viewerOptions.isEmpty() && pickerFriends.loading -> Text(
                                stringResource(R.string.assets_viewers_loading),
                                style = MaterialTheme.typography.bodySmall,
                                color = Muted,
                            )

                            viewerOptions.isEmpty() -> Text(
                                pickerFriends.error ?: stringResource(R.string.assets_viewers_empty),
                                style = MaterialTheme.typography.bodySmall,
                                color = Muted,
                            )

                            else -> Column(
                                verticalArrangement = Arrangement.spacedBy(6.dp),
                            ) {
                                viewerOptions.forEach { person ->
                                    val chosen = viewerIds.contains(person.id)
                                    Surface(
                                        color = if (chosen) SageLight else Ivory,
                                        shape = RoundedCornerShape(12.dp),
                                        border = BorderStroke(1.dp, if (chosen) SageInk else Line),
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .clickable(enabled = !busy) {
                                                viewerIds = if (chosen) {
                                                    viewerIds - person.id
                                                } else {
                                                    viewerIds + person.id
                                                }
                                            },
                                    ) {
                                        Row(
                                            verticalAlignment = Alignment.CenterVertically,
                                            modifier = Modifier.padding(
                                                horizontal = 12.dp,
                                                vertical = 9.dp,
                                            ),
                                        ) {
                                            Avatar(
                                                name = person.displayName.ifBlank {
                                                    person.username
                                                },
                                                url = person.avatarUrl,
                                                size = 34.dp,
                                            )
                                            Spacer(Modifier.width(10.dp))
                                            Column(Modifier.weight(1f)) {
                                                Text(
                                                    person.displayName.ifBlank {
                                                        person.username
                                                    },
                                                    style = MaterialTheme.typography.labelLarge,
                                                    color = Forest,
                                                    maxLines = 1,
                                                )
                                                Text(
                                                    "@${person.username}",
                                                    style = MaterialTheme.typography.labelSmall,
                                                    color = Muted,
                                                    maxLines = 1,
                                                )
                                            }
                                            Spacer(Modifier.width(8.dp))
                                            Box(
                                                contentAlignment = Alignment.Center,
                                                modifier = Modifier
                                                    .size(22.dp)
                                                    .clip(CircleShape)
                                                    .border(
                                                        width = 1.dp,
                                                        color = if (chosen) Forest else Line,
                                                        shape = CircleShape,
                                                    )
                                                    .background(
                                                        if (chosen) Forest else Color.Transparent,
                                                    ),
                                            ) {
                                                if (chosen) {
                                                    Icon(
                                                        Icons.Outlined.Check,
                                                        contentDescription = null,
                                                        tint = Paper,
                                                        modifier = Modifier.size(13.dp),
                                                    )
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
            if (visibility == "selected" && !canManageViewers) {
                Spacer(Modifier.height(10.dp))
                Surface(
                    color = PaperDeep,
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text(
                        stringResource(R.string.asset_detail_viewers_owner_only),
                        style = MaterialTheme.typography.bodySmall,
                        color = Muted,
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 10.dp),
                    )
                }
            }
            if (viewersError) {
                Text(
                    viewersRequiredNotice,
                    style = MaterialTheme.typography.bodySmall,
                    color = Danger,
                    modifier = Modifier.padding(start = 4.dp, top = 6.dp),
                )
            }

            Spacer(Modifier.height(20.dp))
            LocationPicker(
                locationName = locationName,
                onLocationNameChange = { locationName = it },
                latitude = latitude,
                longitude = longitude,
                onLocationPicked = { picked ->
                    latitude = picked.latitude
                    longitude = picked.longitude
                    clearLocation = false
                    // Haritada veya mevcut konumda seçilen noktanın adı yazılır;
                    // kullanıcı alanı sonrasında elle düzenleyebilir.
                    if (!picked.name.isNullOrBlank()) {
                        locationName = picked.name
                    }
                },
                enabled = !busy,
            )

            if (editing && (latitude != null || longitude != null || locationName.isNotBlank())) {
                Spacer(Modifier.height(8.dp))
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

            Spacer(Modifier.height(20.dp))
            SectionLabel(stringResource(R.string.assets_cover_label))
            val coverModel: Any? = coverUri ?: MediaUrl.resolve(draft?.coverUrl)
            Surface(
                color = PaperDeep,
                shape = RoundedCornerShape(16.dp),
                border = BorderStroke(1.dp, Line),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(190.dp)
                    .clickable { picker.launch("image/*") },
            ) {
                if (coverModel != null) {
                    Box(Modifier.fillMaxSize()) {
                        AsyncImage(
                            model = coverModel,
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
                    attempted = true
                    val typeId = selectedId
                    if (typeId == null || title.isBlank() ||
                        (canManageViewers && visibility == "selected" && viewerIds.isEmpty())
                    ) {
                        return@Button
                    }
                    val attributesPayload = attributes.filterValues { it.isNotBlank() }
                    val customFieldsPayload = prepareCustomFields(customFields)
                    if (assetId != null) {
                        vm.updateAsset(
                            assetId = assetId,
                            typeId = typeId,
                            title = title,
                            description = description,
                            visibility = visibility,
                            coverUri = coverUri,
                            locationName = locationName,
                            latitude = latitude,
                            longitude = longitude,
                            clearLocation = clearLocation,
                            viewerIds = viewerIds,
                            attributes = attributesPayload,
                            customFields = customFieldsPayload,
                            onSaved = onCreated,
                        )
                    } else {
                        vm.createAsset(
                            typeId = typeId,
                            title = title,
                            description = description,
                            visibility = visibility,
                            coverUri = coverUri,
                            locationName = locationName,
                            latitude = latitude,
                            longitude = longitude,
                            viewerIds = viewerIds,
                            attributes = attributesPayload,
                            customFields = customFieldsPayload,
                            onCreated = onCreated,
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
                            if (editing) R.string.edit_asset_save else R.string.assets_submit,
                        ),
                        style = MaterialTheme.typography.labelLarge,
                    )
                }
            }
        }
    }
}
