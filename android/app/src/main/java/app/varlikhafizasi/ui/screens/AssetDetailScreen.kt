package app.varlikhafizasi.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Add
import androidx.compose.material.icons.outlined.Alarm
import androidx.compose.material.icons.outlined.Check
import androidx.compose.material.icons.outlined.Delete
import androidx.compose.material.icons.outlined.Edit
import androidx.compose.material.icons.outlined.Groups
import androidx.compose.material.icons.outlined.Place
import androidx.compose.material.icons.outlined.Share
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import app.varlikhafizasi.R
import app.varlikhafizasi.data.Entry
import app.varlikhafizasi.data.MediaUrl
import app.varlikhafizasi.data.User
import app.varlikhafizasi.ui.VhViewModel
import app.varlikhafizasi.ui.components.Avatar
import app.varlikhafizasi.ui.components.EmptyState
import app.varlikhafizasi.ui.components.ErrorBox
import app.varlikhafizasi.ui.components.LoadingBox
import app.varlikhafizasi.ui.components.MediaThumb
import app.varlikhafizasi.ui.components.Pill
import app.varlikhafizasi.ui.components.SectionLabel
import app.varlikhafizasi.ui.components.VhTopBar
import app.varlikhafizasi.ui.components.entryTypeLabel
import app.varlikhafizasi.ui.components.formatDate
import app.varlikhafizasi.ui.components.visibilityLabel
import app.varlikhafizasi.ui.theme.Clay
import app.varlikhafizasi.ui.theme.Danger
import app.varlikhafizasi.ui.theme.Forest
import app.varlikhafizasi.ui.theme.Gold
import app.varlikhafizasi.ui.theme.Line
import app.varlikhafizasi.ui.theme.Muted
import app.varlikhafizasi.ui.theme.Paper
import app.varlikhafizasi.ui.theme.PaperDeep
import app.varlikhafizasi.ui.theme.Sage
import app.varlikhafizasi.ui.theme.SageLight
import app.varlikhafizasi.ui.theme.Ivory
import coil.compose.AsyncImage
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.contentOrNull
import java.time.Instant

private val tabs = listOf(
    R.string.asset_detail_tab_story,
    R.string.asset_detail_tab_media,
    R.string.asset_detail_tab_measurements,
    R.string.asset_detail_tab_people,
)

@Composable
fun AssetDetailScreen(
    vm: VhViewModel,
    viewer: User,
    assetId: String,
    onBack: () -> Unit,
    onEditAsset: () -> Unit,
    onAddEntry: () -> Unit,
    onEditEntry: (String) -> Unit,
    onDeleted: () -> Unit,
) {
    val state by vm.detail.collectAsStateWithLifecycle()
    val privateGroups by vm.privateGroups.collectAsStateWithLifecycle()
    val formError by vm.formError.collectAsStateWithLifecycle()
    val formBusy by vm.formBusy.collectAsStateWithLifecycle()
    val context = LocalContext.current
    var selectedTab by rememberSaveable { mutableStateOf(0) }
    var pendingDelete by rememberSaveable { mutableStateOf<String?>(null) }
    var lightboxUrl by rememberSaveable { mutableStateOf<String?>(null) }
    var accessName by rememberSaveable { mutableStateOf("") }
    var managerDialogOpen by rememberSaveable { mutableStateOf(false) }
    var confirmDeleteAsset by rememberSaveable { mutableStateOf(false) }

    LaunchedEffect(assetId) { vm.loadDetail(assetId) }
    LaunchedEffect(assetId) { vm.clearFormError() }

    val data = state.data
    val asset = data?.detail?.asset
    val isOwner = data?.detail?.access?.isOwner == true
    val canEdit = isOwner || data?.detail?.access?.canEdit == true

    // Ortak yönetim grubu yalnızca sahip tarafından atanır; listeyi sekme açılınca getir.
    LaunchedEffect(selectedTab, isOwner) {
        if (selectedTab == 3 && isOwner) vm.loadPrivateGroups()
    }

    Box(Modifier.fillMaxSize().background(Paper)) {
        LazyColumn(
            contentPadding = PaddingValues(bottom = 32.dp),
            modifier = Modifier.fillMaxSize(),
        ) {
            item {
                VhTopBar(
                    title = asset?.title ?: stringResource(R.string.common_asset),
                    onBack = onBack,
                    subtitle = asset?.type?.label,
                    actions = {
                        if (canEdit) {
                            IconButton(onClick = onEditAsset) {
                                Icon(
                                    Icons.Outlined.Edit,
                                    contentDescription = stringResource(R.string.asset_detail_edit_asset),
                                    tint = Forest,
                                )
                            }
                            IconButton(onClick = onAddEntry) {
                                Icon(
                                    Icons.Outlined.Add,
                                    contentDescription = stringResource(R.string.asset_detail_add_entry),
                                    tint = Forest,
                                )
                            }
                        }
                        IconButton(onClick = { selectedTab = 3 }) {
                            Icon(
                                Icons.Outlined.Share,
                                contentDescription = stringResource(R.string.asset_detail_share_with_people),
                                tint = Forest,
                            )
                        }
                    },
                )
            }

            if (state.loading && data == null) {
                item { LoadingBox() }
            }
            if (state.error != null) {
                item {
                    Box(Modifier.padding(20.dp)) {
                        ErrorBox(state.error ?: "", onRetry = { vm.loadDetail(assetId) })
                    }
                }
            }

            if (data != null) {
                val asset = data.detail.asset
                val attributeRows = buildList {
                    val seen = mutableSetOf<String>()
                    asset.template.fields.forEach { field ->
                        val raw = (asset.attributes[field.key] as? JsonPrimitive)?.contentOrNull
                        if (!raw.isNullOrBlank()) {
                            seen += field.key
                            val shown = if (field.type == "date") formatDate(raw) else raw
                            val unit = field.unit?.takeIf { it.isNotBlank() }
                            add(field.label to if (unit != null) "$shown $unit" else shown)
                        }
                    }
                    asset.attributes.forEach { (key, element) ->
                        if (key !in seen) {
                            val raw = (element as? JsonPrimitive)?.contentOrNull
                            if (!raw.isNullOrBlank()) add(key to raw)
                        }
                    }
                }
                val customFieldRows = asset.customFields.mapNotNull { field ->
                    val value = field.value?.takeIf { it.isNotBlank() } ?: return@mapNotNull null
                    field.label to if (field.type == "date") formatDate(value) else value
                }
                item { Cover(asset.title, asset.coverUrl, asset.type?.label, asset.visibility) }

                item {
                    Column(Modifier.padding(horizontal = 20.dp, vertical = 16.dp)) {
                        if (data.detail.access.isShared) {
                            Surface(color = SageLight, shape = RoundedCornerShape(8.dp)) {
                                Text(
                                    stringResource(R.string.asset_detail_shared_with_you),
                                    style = MaterialTheme.typography.bodySmall,
                                    color = Forest,
                                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                                )
                            }
                            Spacer(Modifier.height(10.dp))
                        }
                        if (data.detail.access.isManager && data.detail.access.manager != null) {
                            Surface(color = SageLight, shape = RoundedCornerShape(8.dp)) {
                                Row(
                                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                ) {
                                    Icon(
                                        Icons.Outlined.Groups,
                                        contentDescription = null,
                                        tint = Forest,
                                        modifier = Modifier.size(14.dp),
                                    )
                                    Spacer(Modifier.width(6.dp))
                                    Text(
                                        stringResource(
                                            R.string.asset_detail_manager_note,
                                            data.detail.access.manager?.name ?: "",
                                        ),
                                        style = MaterialTheme.typography.bodySmall,
                                        color = Forest,
                                    )
                                }
                            }
                            Spacer(Modifier.height(10.dp))
                        }
                        if (!asset.description.isNullOrBlank()) {
                            Text(
                                asset.description ?: "",
                                style = MaterialTheme.typography.bodyLarge,
                                color = Forest,
                            )
                            Spacer(Modifier.height(12.dp))
                        }
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            MiniMeta(
                                "${asset.entryCount}",
                                stringResource(R.string.asset_detail_meta_entries),
                                Modifier.weight(1f),
                            )
                            MiniMeta(
                                asset.acquiredAt?.let { formatDate(it) } ?: "—",
                                stringResource(R.string.asset_detail_meta_acquired),
                                Modifier.weight(1f),
                            )
                            MiniMeta(
                                asset.locationName ?: "—",
                                stringResource(R.string.asset_detail_meta_location),
                                Modifier.weight(1f),
                            )
                        }
                        if (asset.latitude != null && asset.longitude != null) {
                            Spacer(Modifier.height(8.dp))
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .background(PaperDeep, RoundedCornerShape(10.dp))
                                    .clickable {
                                        openInMaps(
                                            context,
                                            asset.latitude,
                                            asset.longitude,
                                            asset.locationName,
                                        )
                                    }
                                    .padding(horizontal = 12.dp, vertical = 9.dp),
                            ) {
                                Icon(
                                    Icons.Outlined.Place,
                                    contentDescription = null,
                                    tint = Forest,
                                    modifier = Modifier.size(18.dp),
                                )
                                Spacer(Modifier.width(8.dp))
                                Column(Modifier.weight(1f)) {
                                    Text(
                                        asset.locationName
                                            ?: stringResource(R.string.asset_detail_meta_location),
                                        style = MaterialTheme.typography.titleSmall,
                                        color = Forest,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis,
                                    )
                                    Text(
                                        formatCoordinates(asset.latitude, asset.longitude),
                                        style = MaterialTheme.typography.bodySmall,
                                        color = Muted,
                                    )
                                }
                                Text(
                                    stringResource(R.string.assets_location_open_maps),
                                    style = MaterialTheme.typography.labelMedium,
                                    color = Forest,
                                )
                            }
                        }
                        if (attributeRows.isNotEmpty() || customFieldRows.isNotEmpty()) {
                            Spacer(Modifier.height(12.dp))
                            Surface(
                                color = PaperDeep,
                                shape = RoundedCornerShape(10.dp),
                                modifier = Modifier.fillMaxWidth(),
                            ) {
                                Column(Modifier.padding(horizontal = 12.dp, vertical = 10.dp)) {
                                    if (attributeRows.isNotEmpty()) {
                                        Text(
                                            stringResource(R.string.assets_template_fields),
                                            style = MaterialTheme.typography.labelMedium,
                                            color = Muted,
                                        )
                                        Spacer(Modifier.height(4.dp))
                                        attributeRows.forEach { (label, value) ->
                                            FactRow(label, value)
                                        }
                                    }
                                    if (customFieldRows.isNotEmpty()) {
                                        if (attributeRows.isNotEmpty()) Spacer(Modifier.height(8.dp))
                                        Text(
                                            stringResource(R.string.assets_custom_fields),
                                            style = MaterialTheme.typography.labelMedium,
                                            color = Muted,
                                        )
                                        Spacer(Modifier.height(4.dp))
                                        customFieldRows.forEach { (label, value) ->
                                            FactRow(label, value)
                                        }
                                    }
                                }
                            }
                        }
                        Spacer(Modifier.height(14.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            if (canEdit) {
                                Surface(
                                    color = Forest,
                                    shape = RoundedCornerShape(50),
                                    modifier = Modifier
                                        .weight(1f)
                                        .clickable { onAddEntry() },
                                ) {
                                    Text(
                                        stringResource(R.string.asset_detail_add_entry),
                                        style = MaterialTheme.typography.labelLarge,
                                        color = Color.White,
                                        modifier = Modifier.padding(vertical = 11.dp),
                                        textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                                    )
                                }
                            }
                            Surface(
                                color = Color.Transparent,
                                border = BorderStroke(1.dp, Line),
                                shape = RoundedCornerShape(50),
                                modifier = Modifier
                                    .weight(1f)
                                    .clickable { selectedTab = 3 },
                            ) {
                                Text(
                                    stringResource(R.string.asset_detail_tab_people),
                                    style = MaterialTheme.typography.labelLarge,
                                    color = Forest,
                                    modifier = Modifier.padding(vertical = 11.dp),
                                    textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                                )
                            }
                        }
                    }
                }

                item {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .horizontalScroll(rememberScrollState())
                            .padding(horizontal = 20.dp, vertical = 4.dp),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        tabs.forEachIndexed { index, labelRes ->
                            Pill(
                                text = stringResource(labelRes),
                                selected = selectedTab == index,
                                onClick = { selectedTab = index },
                            )
                        }
                    }
                    Spacer(Modifier.height(6.dp))
                }

                when (selectedTab) {
                    0 -> {
                        if (data.detail.entries.isEmpty()) {
                            item {
                                EmptyState(
                                    title = stringResource(R.string.asset_detail_story_empty_title),
                                    body = stringResource(R.string.asset_detail_story_empty_body),
                                    actionLabel = if (canEdit) {
                                        stringResource(R.string.asset_detail_add_entry)
                                    } else {
                                        null
                                    },
                                    onAction = if (canEdit) onAddEntry else null,
                                )
                            }
                        }
                        items(data.detail.entries, key = { it.id }) { entry ->
                            val canManage = canEdit || entry.author?.id == viewer.id
                            EntryCard(
                                entry = entry,
                                canEdit = canManage,
                                canDelete = canManage,
                                onEdit = { onEditEntry(entry.id) },
                                onDelete = { pendingDelete = entry.id },
                                onToggleReminder = { done ->
                                    if (done != (entry.reminderDoneAt != null)) {
                                        vm.setReminderDone(assetId, entry.id, done)
                                    }
                                },
                                onOpenMedia = { lightboxUrl = it },
                            )
                        }
                    }

                    1 -> {
                        val media = data.detail.entries.flatMap { it.media }
                        if (media.isEmpty()) {
                            item {
                                EmptyState(
                                    title = stringResource(R.string.asset_detail_media_empty_title),
                                    body = stringResource(R.string.asset_detail_media_empty_body),
                                )
                            }
                        } else {
                            item {
                                Text(
                                    pluralStringResource(
                                        R.plurals.asset_detail_media_count,
                                        media.size,
                                        media.size,
                                    ),
                                    style = MaterialTheme.typography.bodySmall,
                                    color = Muted,
                                    modifier = Modifier.padding(horizontal = 20.dp, vertical = 8.dp),
                                )
                            }
                            items(media.chunked(3)) { rowItems ->
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(horizontal = 20.dp, vertical = 3.dp),
                                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                                ) {
                                    rowItems.forEach { mediaItem ->
                                        MediaThumb(
                                            media = mediaItem,
                                            height = 100.dp,
                                            modifier = Modifier.weight(1f),
                                            onClick = {
                                                if (mediaItem.kind == "image") {
                                                    lightboxUrl = MediaUrl.resolve(mediaItem.url)
                                                }
                                            },
                                        )
                                    }
                                    repeat(3 - rowItems.size) {
                                        Spacer(Modifier.weight(1f))
                                    }
                                }
                            }
                        }
                    }

                    2 -> {
                        val measurements = data.measurements
                        val measureLabels = asset.template.measurements.associate { it.key to it.label }
                        if (measurements.isEmpty()) {
                            item {
                                EmptyState(
                                    title = stringResource(R.string.asset_detail_measurements_empty_title),
                                    body = stringResource(R.string.asset_detail_measurements_empty_body),
                                )
                            }
                        } else {
                            item {
                                SectionLabel(
                                    stringResource(R.string.asset_detail_measurement_history),
                                    modifier = Modifier.padding(horizontal = 20.dp),
                                )
                            }
                            items(measurements, key = { it.id }) { measurement ->
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(horizontal = 20.dp, vertical = 5.dp)
                                        .background(Ivory, RoundedCornerShape(12.dp))
                                        .padding(14.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                ) {
                                    Column(Modifier.weight(1f)) {
                                        Text(
                                            measureLabels[measurement.metric] ?: measurement.metric,
                                            style = MaterialTheme.typography.titleMedium,
                                            color = Forest,
                                        )
                                        Text(
                                            formatDate(measurement.measuredAt),
                                            style = MaterialTheme.typography.bodySmall,
                                            color = Muted,
                                        )
                                    }
                                    Text(
                                        "${formatNumber(measurement.value)} ${measurement.unit}",
                                        style = MaterialTheme.typography.titleLarge,
                                        color = Clay,
                                    )
                                }
                            }
                        }
                    }

                    3 -> {
                        if (isOwner) {
                            item {
                                Column(Modifier.padding(horizontal = 20.dp, vertical = 8.dp)) {
                                    SectionLabel(stringResource(R.string.asset_detail_manager_section))
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Icon(
                                            Icons.Outlined.Groups,
                                            contentDescription = null,
                                            tint = Forest,
                                            modifier = Modifier.size(16.dp),
                                        )
                                        Spacer(Modifier.width(6.dp))
                                        Text(
                                            data.detail.access.manager?.name
                                                ?: stringResource(R.string.asset_detail_manager_off),
                                            style = MaterialTheme.typography.titleSmall,
                                            color = Forest,
                                        )
                                    }
                                    Spacer(Modifier.height(4.dp))
                                    Text(
                                        stringResource(R.string.asset_detail_manager_hint),
                                        style = MaterialTheme.typography.bodySmall,
                                        color = Muted,
                                    )
                                    Spacer(Modifier.height(8.dp))
                                    TextButton(
                                        onClick = { managerDialogOpen = true },
                                        enabled = !formBusy,
                                    ) {
                                        Text(
                                            stringResource(R.string.asset_detail_manager_change),
                                            color = Forest,
                                        )
                                    }
                                    if (formError != null) {
                                        Text(
                                            formError ?: "",
                                            style = MaterialTheme.typography.bodySmall,
                                            color = Danger,
                                        )
                                    }
                                    Spacer(Modifier.height(10.dp))
                                }
                            }
                        }
                        if (isOwner) {
                            item {
                                Column(Modifier.padding(horizontal = 20.dp, vertical = 2.dp)) {
                                    TextButton(
                                        onClick = { confirmDeleteAsset = true },
                                        enabled = !formBusy,
                                    ) {
                                        Icon(
                                            Icons.Outlined.Delete,
                                            contentDescription = null,
                                            tint = Danger,
                                            modifier = Modifier.size(18.dp),
                                        )
                                        Spacer(Modifier.width(6.dp))
                                        Text(
                                            stringResource(R.string.asset_detail_delete_asset),
                                            color = Danger,
                                        )
                                    }
                                    Spacer(Modifier.height(6.dp))
                                }
                            }
                        }
                        item {
                            Column(Modifier.padding(horizontal = 20.dp, vertical = 8.dp)) {
                                SectionLabel(stringResource(R.string.asset_detail_access_section))
                                Text(
                                    visibilityLabel(asset.visibility),
                                    style = MaterialTheme.typography.titleSmall,
                                    color = Forest,
                                )
                                Spacer(Modifier.height(4.dp))
                                Text(
                                    text = when (asset.visibility) {
                                        "public" -> stringResource(R.string.assets_visibility_public_hint)
                                        "friends" -> stringResource(R.string.assets_visibility_friends_hint)
                                        "selected" -> stringResource(R.string.assets_visibility_selected_hint)
                                        else -> stringResource(R.string.assets_visibility_private_hint)
                                    },
                                    style = MaterialTheme.typography.bodySmall,
                                    color = Muted,
                                )
                                Spacer(Modifier.height(14.dp))
                            }
                        }
                        if (data.detail.access.isOwner && asset.visibility == "selected") {
                            item {
                                Row(
                                    modifier = Modifier.padding(horizontal = 20.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                ) {
                                    OutlinedTextField(
                                        value = accessName,
                                        onValueChange = {
                                            accessName = it
                                            vm.clearFormError()
                                        },
                                        label = { Text(stringResource(R.string.asset_detail_username_label)) },
                                        singleLine = true,
                                        enabled = !formBusy,
                                        modifier = Modifier.weight(1f),
                                    )
                                    Spacer(Modifier.width(8.dp))
                                    TextButton(
                                        onClick = {
                                            vm.addAccess(assetId, accessName)
                                            accessName = ""
                                        },
                                        enabled = !formBusy,
                                    ) {
                                        Text(stringResource(R.string.asset_detail_add), color = Forest)
                                    }
                                }
                                if (formError != null) {
                                    Text(
                                        formError ?: "",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = Danger,
                                        modifier = Modifier.padding(horizontal = 20.dp, vertical = 4.dp),
                                    )
                                }
                            }
                            if (data.detail.access.viewers.isEmpty()) {
                                item {
                                    EmptyState(
                                        title = stringResource(R.string.asset_detail_no_viewers_title),
                                        body = stringResource(R.string.asset_detail_no_viewers_body),
                                    )
                                }
                            }
                            items(data.detail.access.viewers, key = { it.user.id }) { viewerAccess ->
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(horizontal = 20.dp, vertical = 5.dp)
                                        .background(Ivory, RoundedCornerShape(12.dp))
                                        .padding(12.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                ) {
                                    Avatar(
                                        name = viewerAccess.user.displayName,
                                        url = viewerAccess.user.avatarUrl,
                                        size = 36.dp,
                                    )
                                    Spacer(Modifier.width(10.dp))
                                    Column(Modifier.weight(1f)) {
                                        Text(
                                            viewerAccess.user.displayName,
                                            style = MaterialTheme.typography.titleSmall,
                                            color = Forest,
                                        )
                                        Text(
                                            "@${viewerAccess.user.username}",
                                            style = MaterialTheme.typography.bodySmall,
                                            color = Muted,
                                        )
                                    }
                                    IconButton(
                                        onClick = { vm.removeAccess(assetId, viewerAccess.user.id) },
                                    ) {
                                        Icon(
                                            Icons.Outlined.Delete,
                                            contentDescription = stringResource(R.string.asset_detail_remove_access),
                                            tint = Clay,
                                        )
                                    }
                                }
                            }
                        } else if (data.detail.access.isOwner) {
                            item {
                                Text(
                                    stringResource(R.string.asset_detail_access_selected_only),
                                    style = MaterialTheme.typography.bodySmall,
                                    color = Muted,
                                    modifier = Modifier.padding(horizontal = 20.dp, vertical = 4.dp),
                                )
                            }
                        } else {
                            item {
                                EmptyState(
                                    title = stringResource(R.string.asset_detail_owner_only_title),
                                    body = stringResource(R.string.asset_detail_owner_only_body),
                                )
                            }
                        }
                    }
                }
            }

            item {
                Spacer(Modifier.height(24.dp))
                Text(
                    "izleer · ${asset?.type?.label ?: ""} · ${if (asset != null) visibilityLabel(asset.visibility) else ""}",
                    style = MaterialTheme.typography.labelSmall,
                    color = Muted,
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 20.dp),
                )
            }
        }
    }

    pendingDelete?.let { entryId ->
        AlertDialog(
            onDismissRequest = { pendingDelete = null },
            title = { Text(stringResource(R.string.asset_detail_delete_title)) },
            text = { Text(stringResource(R.string.asset_detail_delete_body)) },
            confirmButton = {
                TextButton(onClick = {
                    vm.deleteEntry(assetId, entryId)
                    pendingDelete = null
                }) { Text(stringResource(R.string.asset_detail_delete), color = Danger) }
            },
            dismissButton = {
                TextButton(onClick = { pendingDelete = null }) {
                    Text(stringResource(R.string.asset_detail_cancel), color = Forest)
                }
            },
        )
    }

    if (confirmDeleteAsset && isOwner) {
        AlertDialog(
            onDismissRequest = { confirmDeleteAsset = false },
            title = { Text(stringResource(R.string.asset_detail_delete_asset_title)) },
            text = { Text(stringResource(R.string.asset_detail_delete_asset_body)) },
            confirmButton = {
                TextButton(onClick = {
                    confirmDeleteAsset = false
                    vm.deleteAsset(assetId) { onDeleted() }
                }) { Text(stringResource(R.string.asset_detail_delete_asset), color = Danger) }
            },
            dismissButton = {
                TextButton(onClick = { confirmDeleteAsset = false }) {
                    Text(stringResource(R.string.asset_detail_cancel), color = Forest)
                }
            },
        )
    }

    if (managerDialogOpen) {
        val currentManager = data?.detail?.access?.manager
        val groups = privateGroups.data.orEmpty()
        AlertDialog(
            onDismissRequest = { managerDialogOpen = false },
            title = { Text(stringResource(R.string.asset_detail_manager_pick)) },
            text = {
                Column(
                    Modifier
                        .heightIn(max = 320.dp)
                        .verticalScroll(rememberScrollState()),
                ) {
                    ManagerChoice(
                        label = stringResource(R.string.asset_detail_manager_off),
                        selected = currentManager == null,
                        onClick = {
                            managerDialogOpen = false
                            vm.setAssetManager(assetId, null)
                        },
                    )
                    if (privateGroups.loading) {
                        Text(
                            stringResource(R.string.assets_viewers_loading),
                            style = MaterialTheme.typography.bodySmall,
                            color = Muted,
                            modifier = Modifier.padding(8.dp),
                        )
                    } else if (groups.isEmpty()) {
                        Text(
                            stringResource(R.string.asset_detail_manager_no_groups),
                            style = MaterialTheme.typography.bodySmall,
                            color = Muted,
                            modifier = Modifier.padding(8.dp),
                        )
                    } else {
                        groups.forEach { group ->
                            ManagerChoice(
                                label = group.name,
                                selected = currentManager?.id == group.id,
                                onClick = {
                                    managerDialogOpen = false
                                    vm.setAssetManager(assetId, group.id)
                                },
                            )
                        }
                    }
                }
            },
            confirmButton = {
                TextButton(onClick = { managerDialogOpen = false }) {
                    Text(stringResource(R.string.asset_detail_cancel), color = Forest)
                }
            },
        )
    }

    lightboxUrl?.let { url ->
        Dialog(onDismissRequest = { lightboxUrl = null }) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Color.Black, RoundedCornerShape(14.dp)),
            ) {
                AsyncImage(
                    model = url,
                    contentDescription = null,
                    contentScale = ContentScale.Fit,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(420.dp),
                )
                Text(
                    stringResource(R.string.asset_detail_close),
                    style = MaterialTheme.typography.labelLarge,
                    color = Color.White,
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .clickable { lightboxUrl = null }
                        .padding(12.dp),
                )
            }
        }
    }
}

@Composable
private fun Cover(
    title: String,
    coverUrl: String?,
    typeLabel: String?,
    visibility: String,
) {
    val resolved = MediaUrl.resolve(coverUrl)
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(240.dp)
            .background(Forest),
    ) {
        if (resolved != null) {
            AsyncImage(
                model = resolved,
                contentDescription = title,
                contentScale = ContentScale.Crop,
                modifier = Modifier.fillMaxSize(),
            )
        } else {
            Box(
                modifier = Modifier
                    .size(130.dp)
                    .align(Alignment.Center)
                    .background(Sage.copy(alpha = 0.25f), RoundedCornerShape(65.dp)),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    typeLabel?.take(1)?.uppercase() ?: "V",
                    style = MaterialTheme.typography.displayLarge,
                    color = Paper.copy(alpha = 0.7f),
                )
            }
        }
        Box(
            modifier = Modifier
                .matchParentSize()
                .background(
                    Brush.verticalGradient(
                        0f to Color.Transparent,
                        0.35f to Forest.copy(alpha = 0.10f),
                        0.62f to Forest.copy(alpha = 0.55f),
                        1f to Forest.copy(alpha = 0.94f),
                    ),
                ),
        )
        Column(
            modifier = Modifier
                .align(Alignment.BottomStart)
                .padding(20.dp),
        ) {
            Text(
                (typeLabel ?: stringResource(R.string.asset_detail_cover_type_fallback)).uppercase(),
                style = MaterialTheme.typography.labelSmall,
                color = Gold,
            )
            Spacer(Modifier.height(4.dp))
            Text(
                title,
                style = MaterialTheme.typography.headlineLarge,
                color = Paper,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
            )
            Spacer(Modifier.height(6.dp))
            Text(
                visibilityLabel(visibility),
                style = MaterialTheme.typography.labelMedium,
                color = Paper.copy(alpha = 0.92f),
            )
        }
    }
}

@Composable
private fun MiniMeta(value: String, label: String, modifier: Modifier = Modifier) {
    Column(
        modifier = modifier
            .background(PaperDeep, RoundedCornerShape(10.dp))
            .padding(horizontal = 10.dp, vertical = 9.dp),
    ) {
        Text(
            value,
            style = MaterialTheme.typography.titleSmall,
            color = Forest,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
        Text(
            label.uppercase(),
            style = MaterialTheme.typography.labelSmall,
            color = Muted,
        )
    }
}

@Composable
private fun FactRow(label: String, value: String) {
    Row(
        verticalAlignment = Alignment.Top,
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 3.dp),
    ) {
        Text(
            label,
            style = MaterialTheme.typography.bodySmall,
            color = Muted,
            modifier = Modifier.weight(1f),
        )
        Spacer(Modifier.width(10.dp))
        Text(
            value,
            style = MaterialTheme.typography.bodyMedium,
            color = Forest,
            modifier = Modifier.weight(1.4f),
        )
    }
}

@Composable
internal fun EntryCard(
    entry: Entry,
    canEdit: Boolean,
    canDelete: Boolean,
    onEdit: () -> Unit,
    onDelete: () -> Unit,
    onToggleReminder: (Boolean) -> Unit,
    onOpenMedia: (String?) -> Unit,
    showVisibility: Boolean = true,
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 20.dp, vertical = 6.dp)
            .background(Ivory, RoundedCornerShape(16.dp))
            .padding(16.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Surface(color = SageLight, shape = RoundedCornerShape(4.dp)) {
                Text(
                    entryTypeLabel(entry.type).uppercase(),
                    style = MaterialTheme.typography.labelSmall,
                    color = Forest,
                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 3.dp),
                )
            }
            Spacer(Modifier.weight(1f))
            Text(
                formatDate(entry.occurredAt),
                style = MaterialTheme.typography.bodySmall,
                color = Muted,
            )
            if (canEdit) {
                IconButton(onClick = onEdit, modifier = Modifier.size(32.dp)) {
                    Icon(
                        Icons.Outlined.Edit,
                        contentDescription = stringResource(R.string.asset_detail_edit_entry),
                        tint = Muted,
                        modifier = Modifier.size(17.dp),
                    )
                }
            }
            if (canDelete) {
                IconButton(onClick = onDelete, modifier = Modifier.size(32.dp)) {
                    Icon(
                        Icons.Outlined.Delete,
                        contentDescription = stringResource(R.string.asset_detail_delete),
                        tint = Muted,
                        modifier = Modifier.size(17.dp),
                    )
                }
            }
        }
        if (!entry.title.isNullOrBlank()) {
            Spacer(Modifier.height(6.dp))
            Text(
                entry.title ?: "",
                style = MaterialTheme.typography.titleLarge,
                color = Forest,
            )
        }
        if (!entry.body.isNullOrBlank()) {
            Spacer(Modifier.height(5.dp))
            Text(
                entry.body ?: "",
                style = MaterialTheme.typography.bodyMedium,
                color = Forest.copy(alpha = 0.9f),
            )
        }
        if (entry.type == "reminder" && entry.dueAt != null) {
            Spacer(Modifier.height(8.dp))
            ReminderStatus(entry = entry, canEdit = canEdit, onToggle = onToggleReminder)
        }
        if (!entry.locationName.isNullOrBlank() || entry.latitude != null) {
            Spacer(Modifier.height(6.dp))
            val context = LocalContext.current
            val lat = entry.latitude
            val lng = entry.longitude
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.clickable(enabled = lat != null && lng != null) {
                    if (lat != null && lng != null) {
                        openInMaps(context, lat, lng, entry.locationName)
                    }
                },
            ) {
                Icon(
                    Icons.Outlined.Place,
                    contentDescription = null,
                    tint = Clay,
                    modifier = Modifier.size(14.dp),
                )
                Spacer(Modifier.width(5.dp))
                Text(
                    text = entry.locationName?.takeIf { it.isNotBlank() }
                        ?: formatCoordinates(lat ?: 0.0, lng ?: 0.0),
                    style = MaterialTheme.typography.bodySmall,
                    color = Clay,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
        }
        if (entry.media.isNotEmpty()) {
            Spacer(Modifier.height(10.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                entry.media.take(3).forEach { media ->
                    MediaThumb(
                        media = media,
                        height = 96.dp,
                        modifier = Modifier.weight(1f),
                        onClick = { onOpenMedia(MediaUrl.resolve(media.url)) },
                    )
                }
                repeat(3 - entry.media.take(3).size) {
                    Spacer(Modifier.weight(1f))
                }
            }
        }
        Spacer(Modifier.height(10.dp))
        Row(verticalAlignment = Alignment.CenterVertically) {
            entry.author?.let {
                Avatar(it.displayName, it.avatarUrl, size = 22.dp)
                Spacer(Modifier.width(6.dp))
                Text(
                    it.displayName,
                    style = MaterialTheme.typography.bodySmall,
                    color = Muted,
                )
            }
            Spacer(Modifier.weight(1f))
            if (showVisibility) {
                Text(
                    visibilityLabel(entry.visibility),
                    style = MaterialTheme.typography.labelSmall,
                    color = Muted,
                )
            }
        }
    }
}

@Composable
private fun ReminderStatus(
    entry: Entry,
    canEdit: Boolean,
    onToggle: (Boolean) -> Unit,
) {
    val due = entry.dueAt ?: return
    val done = entry.reminderDoneAt != null
    val overdue = !done && runCatching { Instant.parse(due).toEpochMilli() }.getOrNull()
        ?.let { it < System.currentTimeMillis() } == true
    val tint = when {
        done -> Muted
        overdue -> Danger
        else -> Clay
    }
    Surface(
        color = PaperDeep,
        shape = RoundedCornerShape(10.dp),
        border = BorderStroke(1.dp, Line),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(Modifier.padding(horizontal = 12.dp, vertical = 10.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    Icons.Outlined.Alarm,
                    contentDescription = null,
                    tint = tint,
                    modifier = Modifier.size(16.dp),
                )
                Spacer(Modifier.width(6.dp))
                Column(Modifier.weight(1f)) {
                    Text(
                        stringResource(
                            R.string.asset_detail_reminder_due,
                            formatDate(due, withTime = true),
                        ),
                        style = MaterialTheme.typography.bodySmall,
                        color = Forest,
                    )
                    Text(
                        stringResource(
                            when {
                                done -> R.string.asset_detail_reminder_done
                                overdue -> R.string.asset_detail_reminder_overdue
                                else -> R.string.asset_detail_reminder_planned
                            },
                        ),
                        style = MaterialTheme.typography.labelSmall,
                        color = tint,
                    )
                }
                if (canEdit) {
                    TextButton(onClick = { onToggle(!done) }) {
                        Text(
                            stringResource(
                                if (done) {
                                    R.string.asset_detail_reminder_reopen
                                } else {
                                    R.string.asset_detail_reminder_complete
                                },
                            ),
                            style = MaterialTheme.typography.labelSmall,
                            color = Forest,
                        )
                    }
                }
            }
            val doneAt = entry.reminderDoneAt
            if (doneAt != null) {
                Spacer(Modifier.height(2.dp))
                Text(
                    stringResource(
                        R.string.asset_detail_reminder_done_at,
                        formatDate(doneAt, withTime = true),
                    ),
                    style = MaterialTheme.typography.labelSmall,
                    color = Muted,
                )
            }
        }
    }
}

@Composable
private fun ManagerChoice(label: String, selected: Boolean, onClick: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(8.dp))
            .clickable { onClick() }
            .padding(horizontal = 8.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(
            if (selected) Icons.Outlined.Check else Icons.Outlined.Groups,
            contentDescription = null,
            tint = if (selected) Forest else Muted,
            modifier = Modifier.size(18.dp),
        )
        Spacer(Modifier.width(10.dp))
        Text(
            text = label,
            style = MaterialTheme.typography.bodyMedium,
            color = Forest,
            modifier = Modifier.weight(1f),
        )
    }
}

private fun formatNumber(value: Double): String =
    if (value % 1.0 == 0.0) value.toInt().toString() else String.format("%.1f", value)
