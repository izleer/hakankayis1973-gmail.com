package app.varlikhafizasi.ui.screens

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
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Groups
import androidx.compose.material.icons.outlined.Lock
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
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
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import app.varlikhafizasi.R
import app.varlikhafizasi.data.Asset
import app.varlikhafizasi.data.GroupAssetShare
import app.varlikhafizasi.data.MediaUrl
import app.varlikhafizasi.ui.VhViewModel
import app.varlikhafizasi.ui.components.Avatar
import app.varlikhafizasi.ui.components.EmptyState
import app.varlikhafizasi.ui.components.ErrorBox
import app.varlikhafizasi.ui.components.LoadingBox
import app.varlikhafizasi.ui.components.SectionLabel
import app.varlikhafizasi.ui.components.VhTopBar
import app.varlikhafizasi.ui.components.formatDate
import app.varlikhafizasi.ui.theme.Clay
import app.varlikhafizasi.ui.theme.Forest
import app.varlikhafizasi.ui.theme.Gold
import app.varlikhafizasi.ui.theme.Muted
import app.varlikhafizasi.ui.theme.Paper
import app.varlikhafizasi.ui.theme.PaperDeep
import app.varlikhafizasi.ui.theme.SageLight
import coil.compose.AsyncImage
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.contentOrNull

/**
 * Grupta paylaşılan varlığın detay sayfası.
 *
 * Kayıtlar API tarafından paylaşım kapsamına göre süzülür: "summary"
 * kapsamında hikâye kilitli görünür, "timeline" yalnızca herkese açık
 * kayıtları, "all" ise bütün hikâyeyi getirir.
 */
@Composable
fun GroupAssetScreen(
    vm: VhViewModel,
    slug: String,
    assetId: String,
    onBack: () -> Unit,
) {
    val state by vm.groupAsset.collectAsStateWithLifecycle()
    var lightboxUrl by rememberSaveable { mutableStateOf<String?>(null) }

    LaunchedEffect(slug, assetId) { vm.loadGroupAsset(slug, assetId) }
    DisposableEffect(Unit) {
        onDispose { vm.clearGroupAsset() }
    }

    val data = state.data
    val asset = data?.asset
    val share = data?.share
    val entries = data?.entries.orEmpty()
    val photoCount = entries.flatMap { it.media }.count { it.kind == "image" }

    Box(
        Modifier
            .fillMaxSize()
            .background(Paper),
    ) {
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(bottom = 32.dp),
        ) {
            item {
                VhTopBar(
                    title = asset?.title ?: stringResource(R.string.groups_asset_title),
                    onBack = onBack,
                    subtitle = data?.community?.name ?: asset?.type?.label,
                )
            }

            if (state.loading && data == null) item { LoadingBox() }
            if (state.error != null) {
                item {
                    Box(Modifier.padding(horizontal = 20.dp)) {
                        ErrorBox(
                            state.error ?: "",
                            onRetry = { vm.loadGroupAsset(slug, assetId) },
                        )
                    }
                }
            }

            if (data != null) {
                item { GroupAssetHero(data.asset, share) }
                item {
                    GroupAssetInfo(
                        asset = data.asset,
                        share = share,
                        entryCount = entries.size,
                        photoCount = photoCount,
                    )
                }
                item { GroupScopeNote(share) }

                when {
                    share?.scope == "summary" -> item { LockedStory() }
                    entries.isEmpty() -> item {
                        EmptyState(
                            title = stringResource(R.string.groups_asset_empty_title),
                            body = stringResource(R.string.groups_asset_empty_body),
                        )
                    }
                    else -> {
                        item {
                            SectionLabel(
                                stringResource(R.string.asset_detail_tab_story),
                                modifier = Modifier.padding(horizontal = 20.dp, vertical = 8.dp),
                            )
                        }
                        items(entries, key = { it.id }) { entry ->
                            EntryCard(
                                entry = entry,
                                canEdit = false,
                                canDelete = false,
                                onEdit = {},
                                onDelete = {},
                                onToggleReminder = {},
                                onOpenMedia = { lightboxUrl = it },
                                showVisibility = false,
                            )
                        }
                    }
                }
            }

            item {
                Spacer(Modifier.height(20.dp))
                Text(
                    "izleer · ${asset?.type?.label ?: stringResource(R.string.groups_asset_title)}",
                    style = MaterialTheme.typography.labelSmall,
                    color = Muted,
                    modifier = Modifier.padding(horizontal = 20.dp),
                )
            }
        }
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
private fun GroupAssetHero(asset: Asset, share: GroupAssetShare?) {
    val cover = MediaUrl.resolve(asset.coverUrl)
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 20.dp)
            .height(210.dp)
            .clip(RoundedCornerShape(20.dp))
            .background(Forest),
    ) {
        if (cover != null) {
            AsyncImage(
                model = cover,
                contentDescription = asset.title,
                contentScale = ContentScale.Crop,
                modifier = Modifier.fillMaxSize(),
            )
        } else {
            Box(
                modifier = Modifier
                    .size(120.dp)
                    .align(Alignment.Center)
                    .background(SageLight.copy(alpha = 0.55f), RoundedCornerShape(60.dp)),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    asset.type?.label?.take(1)?.uppercase() ?: "V",
                    style = MaterialTheme.typography.displayLarge,
                    color = Forest,
                )
            }
        }
        Box(
            modifier = Modifier
                .matchParentSize()
                .background(
                    Brush.verticalGradient(
                        0f to Color.Transparent,
                        0.4f to Forest.copy(alpha = 0.15f),
                        1f to Forest.copy(alpha = 0.92f),
                    ),
                ),
        )
        Column(
            modifier = Modifier
                .align(Alignment.BottomStart)
                .padding(18.dp),
        ) {
            Text(
                (asset.type?.label ?: stringResource(R.string.common_asset)).uppercase(),
                style = MaterialTheme.typography.labelSmall,
                color = Gold,
            )
            Spacer(Modifier.height(4.dp))
            Text(
                asset.title,
                style = MaterialTheme.typography.headlineLarge,
                color = Paper,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
            )
            Spacer(Modifier.height(8.dp))
            Surface(color = SageLight, shape = RoundedCornerShape(50)) {
                Text(
                    text = if (share?.managed == true) {
                        stringResource(R.string.asset_detail_manager_section)
                    } else {
                        scopeLabel(share?.scope)
                    },
                    style = MaterialTheme.typography.labelMedium,
                    color = Forest,
                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                )
            }
        }
    }
}

@Composable
private fun GroupAssetInfo(
    asset: Asset,
    share: GroupAssetShare?,
    entryCount: Int,
    photoCount: Int,
) {
    val facts = buildList {
        val seen = mutableSetOf<String>()
        asset.template.fields.forEach { field ->
            val raw = (asset.attributes[field.key] as? JsonPrimitive)?.contentOrNull
            if (!raw.isNullOrBlank()) {
                seen += field.key
                val value = if (field.type == "date") formatDate(raw) else raw
                add(field.label to if (field.unit.isNullOrBlank()) value else "$value ${field.unit}")
            }
        }
        asset.attributes.forEach { (key, element) ->
            if (key !in seen) {
                val raw = (element as? JsonPrimitive)?.contentOrNull
                if (!raw.isNullOrBlank()) add(key to raw)
            }
        }
        asset.customFields.forEach { field ->
            val value = field.value?.takeIf { it.isNotBlank() } ?: return@forEach
            add(field.label to if (field.type == "date") formatDate(value) else value)
        }
    }

    Column(Modifier.padding(horizontal = 20.dp, vertical = 14.dp)) {
        if (!asset.description.isNullOrBlank()) {
            Text(
                asset.description ?: "",
                style = MaterialTheme.typography.bodyLarge,
                color = Forest,
            )
            Spacer(Modifier.height(12.dp))
        }

        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            MetaTile(
                value = entryCount.toString(),
                label = stringResource(R.string.groups_asset_metric_entries),
                modifier = Modifier.weight(1f),
            )
            MetaTile(
                value = photoCount.toString(),
                label = stringResource(R.string.groups_asset_metric_photos),
                modifier = Modifier.weight(1f),
            )
            asset.acquiredAt?.let { acquired ->
                MetaTile(
                    value = formatDate(acquired),
                    label = stringResource(R.string.asset_detail_meta_acquired),
                    modifier = Modifier.weight(1f),
                )
            }
        }

        if (facts.isNotEmpty()) {
            Spacer(Modifier.height(12.dp))
            Surface(
                color = PaperDeep,
                shape = RoundedCornerShape(10.dp),
                modifier = Modifier.fillMaxWidth(),
            ) {
                Column(Modifier.padding(horizontal = 12.dp, vertical = 10.dp)) {
                    facts.take(6).forEach { (label, value) ->
                        FactRow(label, value)
                    }
                }
            }
        }

        asset.owner?.let { owner ->
            Spacer(Modifier.height(14.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Avatar(owner.displayName, owner.avatarUrl, size = 30.dp)
                Spacer(Modifier.width(8.dp))
                Column(Modifier.weight(1f)) {
                    Text(
                        stringResource(
                            R.string.groups_asset_owner,
                            owner.displayName,
                            owner.username,
                        ),
                        style = MaterialTheme.typography.bodyMedium,
                        color = Forest,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                    share?.sharedAt?.let { sharedAt ->
                        Text(
                            stringResource(
                                R.string.groups_asset_shared_on,
                                formatDate(sharedAt),
                            ),
                            style = MaterialTheme.typography.bodySmall,
                            color = Muted,
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun GroupScopeNote(share: GroupAssetShare?) {
    val note = when {
        share?.managed == true -> stringResource(R.string.groups_asset_scope_note_managed)
        share?.scope == "all" -> stringResource(R.string.groups_asset_scope_note_all)
        share?.scope == "timeline" -> stringResource(R.string.groups_asset_scope_note_timeline)
        else -> stringResource(R.string.groups_asset_scope_note_summary)
    }
    Surface(
        color = SageLight,
        shape = RoundedCornerShape(12.dp),
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 20.dp),
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(
                Icons.Outlined.Groups,
                contentDescription = null,
                tint = Forest,
                modifier = Modifier.size(16.dp),
            )
            Spacer(Modifier.width(8.dp))
            Text(
                note,
                style = MaterialTheme.typography.bodySmall,
                color = Forest,
            )
        }
    }
}

@Composable
private fun LockedStory() {
    Surface(
        color = PaperDeep,
        shape = RoundedCornerShape(16.dp),
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 20.dp, vertical = 12.dp),
    ) {
        Column(
            modifier = Modifier.padding(horizontal = 20.dp, vertical = 26.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Icon(
                Icons.Outlined.Lock,
                contentDescription = null,
                tint = Clay,
                modifier = Modifier.size(26.dp),
            )
            Spacer(Modifier.height(10.dp))
            Text(
                stringResource(R.string.groups_asset_locked_title),
                style = MaterialTheme.typography.titleLarge,
                color = Forest,
                textAlign = TextAlign.Center,
            )
            Spacer(Modifier.height(6.dp))
            Text(
                stringResource(R.string.groups_asset_locked_body),
                style = MaterialTheme.typography.bodyMedium,
                color = Muted,
                textAlign = TextAlign.Center,
            )
        }
    }
}

@Composable
private fun MetaTile(value: String, label: String, modifier: Modifier = Modifier) {
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
