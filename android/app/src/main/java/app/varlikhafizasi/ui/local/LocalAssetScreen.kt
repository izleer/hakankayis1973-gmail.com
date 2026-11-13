package app.varlikhafizasi.ui.local

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Alarm
import androidx.compose.material.icons.outlined.Delete
import androidx.compose.material.icons.outlined.Edit
import androidx.compose.material.icons.outlined.PhotoCamera
import androidx.compose.material.icons.outlined.Place
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
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
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import app.varlikhafizasi.R
import app.varlikhafizasi.data.local.LocalEntry
import app.varlikhafizasi.data.local.LocalLimits
import app.varlikhafizasi.ui.components.ErrorBox
import app.varlikhafizasi.ui.components.LoadingBox
import app.varlikhafizasi.ui.components.SectionLabel
import app.varlikhafizasi.ui.components.VhTopBar
import app.varlikhafizasi.ui.screens.formatCoordinates
import app.varlikhafizasi.ui.screens.openInMaps
import app.varlikhafizasi.ui.theme.Forest
import app.varlikhafizasi.ui.theme.Ivory
import app.varlikhafizasi.ui.theme.Muted
import app.varlikhafizasi.ui.theme.Paper
import app.varlikhafizasi.ui.theme.PaperDeep
import app.varlikhafizasi.ui.theme.TerracottaInk
import app.varlikhafizasi.ui.theme.TerracottaPale
import coil.compose.AsyncImage
import java.io.File

private data class PhotoItem(val file: File, val label: String)

@Composable
fun LocalAssetScreen(
    vm: LocalViewModel,
    assetId: String,
    onBack: () -> Unit,
    onEditAsset: () -> Unit,
    onAddEntry: () -> Unit,
    onEditEntry: (String) -> Unit,
    onDeleted: () -> Unit,
) {
    val state by vm.asset.collectAsStateWithLifecycle()
    var confirmDelete by rememberSaveable { mutableStateOf(false) }
    var viewing by remember { mutableStateOf<PhotoItem?>(null) }

    LaunchedEffect(assetId) { vm.loadAsset(assetId) }

    val data = state.data
    val photos = remember(data, assetId) {
        if (data == null) emptyList() else buildList {
            data.asset.coverPath?.let { path ->
                vm.mediaFile(path)?.takeIf { it.exists() }?.let {
                    add(PhotoItem(it, formatLocalDate(data.asset.updatedAt)))
                }
            }
            data.entries.forEach { entry ->
                entry.photoPath?.let { path ->
                    vm.mediaFile(path)?.takeIf { it.exists() }?.let {
                        add(PhotoItem(it, formatLocalDate(entry.occurredAt)))
                    }
                }
            }
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Paper),
    ) {
        VhTopBar(
            title = data?.asset?.title ?: stringResource(R.string.local_assets_title),
            subtitle = data?.asset?.let { localCategoryLabel(it.category) },
            onBack = onBack,
            actions = {
                if (data != null) {
                    IconButton(onClick = onEditAsset) {
                        Icon(Icons.Outlined.Edit, contentDescription = stringResource(R.string.local_asset_edit), tint = Forest)
                    }
                    IconButton(onClick = { confirmDelete = true }) {
                        Icon(Icons.Outlined.Delete, contentDescription = stringResource(R.string.local_asset_delete), tint = Forest)
                    }
                }
            },
        )

        when {
            state.loading && data == null -> LoadingBox()
            state.error != null -> ErrorBox(state.error ?: "", onRetry = { vm.loadAsset(assetId) })
            data != null -> LazyColumn(
                contentPadding = PaddingValues(horizontal = 20.dp, vertical = 6.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
                modifier = Modifier.fillMaxSize(),
            ) {
                item {
                    val cover = vm.mediaFile(data.asset.coverPath)
                    if (cover?.exists() == true) {
                        AsyncImage(
                            model = cover,
                            contentDescription = data.asset.title,
                            contentScale = ContentScale.Crop,
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(220.dp)
                                .clip(RoundedCornerShape(20.dp))
                                .clickable { viewing = PhotoItem(cover, formatLocalDate(data.asset.updatedAt)) },
                        )
                    } else {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(150.dp)
                                .background(TerracottaPale, RoundedCornerShape(20.dp))
                                .clickable { onEditAsset() },
                            contentAlignment = Alignment.Center,
                        ) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Icon(Icons.Outlined.PhotoCamera, contentDescription = null, tint = TerracottaInk)
                                Spacer(Modifier.height(6.dp))
                                Text(
                                    stringResource(R.string.local_form_cover_add),
                                    style = MaterialTheme.typography.bodySmall,
                                    color = TerracottaInk,
                                )
                            }
                        }
                    }
                }

                if (!data.asset.description.isNullOrBlank()) {
                    item {
                        Text(
                            data.asset.description,
                            style = MaterialTheme.typography.bodyMedium,
                            color = Forest,
                        )
                    }
                }

                item {
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        MetaPill(
                            pluralStringResource(
                                R.plurals.local_entries_count,
                                data.entries.size,
                                data.entries.size,
                            ),
                        )
                        MetaPill(
                            pluralStringResource(
                                R.plurals.local_photos_count,
                                photos.size,
                                photos.size,
                            ),
                        )
                    }
                }

                if (photos.isNotEmpty()) {
                    item { SectionLabel(stringResource(R.string.local_stat_photos)) }
                    item {
                        LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            items(photos, key = { it.file.absolutePath }) { photo ->
                                Column(modifier = Modifier.width(110.dp)) {
                                    AsyncImage(
                                        model = photo.file,
                                        contentDescription = photo.label,
                                        contentScale = ContentScale.Crop,
                                        modifier = Modifier
                                            .size(110.dp)
                                            .clip(RoundedCornerShape(12.dp))
                                            .clickable { viewing = photo },
                                    )
                                    Text(
                                        photo.label,
                                        style = MaterialTheme.typography.labelSmall,
                                        color = Muted,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis,
                                        modifier = Modifier.padding(top = 3.dp),
                                    )
                                }
                            }
                        }
                    }
                }

                item {
                    val entryLimitReached = data.entries.size >= LocalLimits.MAX_ENTRIES_PER_ASSET
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(top = 6.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        SectionLabel(
                            stringResource(R.string.local_asset_timeline),
                            modifier = Modifier.weight(1f),
                        )
                        Surface(
                            color = if (entryLimitReached) PaperDeep else Forest,
                            shape = RoundedCornerShape(50),
                            modifier = Modifier.clickable {
                                if (entryLimitReached) vm.notifyEntryLimit() else onAddEntry()
                            },
                        ) {
                            Text(
                                stringResource(R.string.local_new_entry),
                                style = MaterialTheme.typography.labelMedium,
                                color = if (entryLimitReached) Muted else Paper,
                                modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp),
                            )
                        }
                    }
                    if (entryLimitReached) {
                        Text(
                            stringResource(R.string.local_limit_entries_body),
                            style = MaterialTheme.typography.bodySmall,
                            color = TerracottaInk,
                            modifier = Modifier.padding(top = 6.dp),
                        )
                    }
                }

                if (data.entries.isEmpty()) {
                    item {
                        Text(
                            stringResource(R.string.local_asset_no_entries),
                            style = MaterialTheme.typography.bodySmall,
                            color = Muted,
                            modifier = Modifier.padding(vertical = 8.dp),
                        )
                    }
                } else {
                    items(data.entries, key = { it.id }) { entry ->
                        EntryRow(
                            entry = entry,
                            photoFile = vm.mediaFile(entry.photoPath),
                            onClick = { onEditEntry(entry.id) },
                            onPhotoOpen = {
                                vm.mediaFile(entry.photoPath)?.let {
                                    viewing = PhotoItem(it, formatLocalDate(entry.occurredAt))
                                }
                            },
                        )
                    }
                }

                item { Spacer(Modifier.height(24.dp)) }
            }
        }
    }

    if (confirmDelete) {
        AlertDialog(
            onDismissRequest = { confirmDelete = false },
            title = { Text(stringResource(R.string.local_asset_delete), color = Forest) },
            text = { Text(stringResource(R.string.local_asset_delete_confirm)) },
            confirmButton = {
                TextButton(onClick = {
                    confirmDelete = false
                    vm.deleteAsset(assetId, onDeleted)
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

    viewing?.let { photo ->
        Dialog(onDismissRequest = { viewing = null }) {
            Surface(color = Forest, shape = RoundedCornerShape(18.dp)) {
                Column(Modifier.padding(10.dp)) {
                    AsyncImage(
                        model = photo.file,
                        contentDescription = photo.label,
                        contentScale = ContentScale.Fit,
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(420.dp),
                    )
                    Text(
                        photo.label,
                        style = MaterialTheme.typography.bodySmall,
                        color = Paper,
                        modifier = Modifier.padding(8.dp),
                    )
                }
            }
        }
    }
}

@Composable
private fun MetaPill(text: String) {
    Surface(color = PaperDeep, shape = RoundedCornerShape(50)) {
        Text(
            text,
            style = MaterialTheme.typography.labelSmall,
            color = Forest,
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp),
        )
    }
}

@Composable
private fun EntryRow(
    entry: LocalEntry,
    photoFile: File?,
    onClick: () -> Unit,
    onPhotoOpen: () -> Unit,
) {
    Surface(
        color = Ivory,
        shape = RoundedCornerShape(16.dp),
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() },
    ) {
        Row(Modifier.padding(12.dp)) {
            if (photoFile?.exists() == true) {
                AsyncImage(
                    model = photoFile,
                    contentDescription = entry.title,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier
                        .size(64.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .clickable { onPhotoOpen() },
                )
                Spacer(Modifier.width(12.dp))
            } else {
                Box(
                    modifier = Modifier
                        .size(40.dp)
                        .clip(CircleShape)
                        .background(TerracottaPale),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(
                        Icons.Outlined.Place,
                        contentDescription = null,
                        tint = TerracottaInk,
                        modifier = Modifier.size(20.dp),
                    )
                }
                Spacer(Modifier.width(12.dp))
            }
            Column(Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        localKindLabel(entry.kind).uppercase(),
                        style = MaterialTheme.typography.labelSmall,
                        color = TerracottaInk,
                    )
                    Spacer(Modifier.weight(1f))
                    Text(
                        formatLocalDate(entry.occurredAt),
                        style = MaterialTheme.typography.labelSmall,
                        color = Muted,
                    )
                }
                if (!entry.title.isNullOrBlank()) {
                    Text(
                        entry.title,
                        style = MaterialTheme.typography.titleMedium,
                        color = Forest,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
                if (!entry.body.isNullOrBlank()) {
                    Text(
                        entry.body,
                        style = MaterialTheme.typography.bodySmall,
                        color = Muted,
                        maxLines = 3,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
                entry.dueAt?.let { due ->
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.padding(top = 4.dp),
                    ) {
                        Icon(Icons.Outlined.Alarm, contentDescription = null, tint = TerracottaInk, modifier = Modifier.size(14.dp))
                        Spacer(Modifier.width(4.dp))
                        Text(
                            formatLocalDate(due, withTime = true),
                            style = MaterialTheme.typography.labelSmall,
                            color = TerracottaInk,
                        )
                        if (entry.doneAt != null) {
                            Spacer(Modifier.width(6.dp))
                            Text(
                                "✓",
                                style = MaterialTheme.typography.labelSmall,
                                color = Forest,
                            )
                        }
                    }
                }
                if (!entry.locationName.isNullOrBlank() || entry.latitude != null) {
                    val context = LocalContext.current
                    val lat = entry.latitude
                    val lng = entry.longitude
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier
                            .padding(top = 4.dp)
                            .clickable(enabled = lat != null && lng != null) {
                                if (lat != null && lng != null) {
                                    openInMaps(context, lat, lng, entry.locationName)
                                }
                            },
                    ) {
                        Icon(
                            Icons.Outlined.Place,
                            contentDescription = null,
                            tint = TerracottaInk,
                            modifier = Modifier.size(14.dp),
                        )
                        Spacer(Modifier.width(4.dp))
                        Text(
                            text = entry.locationName?.takeIf { it.isNotBlank() }
                                ?: formatCoordinates(lat ?: 0.0, lng ?: 0.0),
                            style = MaterialTheme.typography.labelSmall,
                            color = TerracottaInk,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                        )
                    }
                }
            }
        }
    }
}
