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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Add
import androidx.compose.material.icons.outlined.Alarm
import androidx.compose.material.icons.outlined.ChevronRight
import androidx.compose.material.icons.outlined.Cloud
import androidx.compose.material.icons.outlined.PhotoCamera
import androidx.compose.material.icons.outlined.Settings
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import app.varlikhafizasi.R
import app.varlikhafizasi.data.local.LocalAssetSummary
import app.varlikhafizasi.data.local.LocalLimits
import app.varlikhafizasi.data.local.LocalReminder
import app.varlikhafizasi.ui.components.EmptyState
import app.varlikhafizasi.ui.components.ErrorBox
import app.varlikhafizasi.ui.components.LoadingBox
import app.varlikhafizasi.ui.components.SectionLabel
import app.varlikhafizasi.ui.theme.Forest
import app.varlikhafizasi.ui.theme.Ivory
import app.varlikhafizasi.ui.theme.Line
import app.varlikhafizasi.ui.theme.Muted
import app.varlikhafizasi.ui.theme.Paper
import app.varlikhafizasi.ui.theme.PaperDeep
import app.varlikhafizasi.ui.theme.TerracottaInk
import app.varlikhafizasi.ui.theme.TerracottaPale
import coil.compose.AsyncImage

@Composable
fun LocalHomeScreen(
    vm: LocalViewModel,
    onOpenAssets: () -> Unit,
    onOpenReminders: () -> Unit,
    onOpenAsset: (String) -> Unit,
    onNewAsset: () -> Unit,
    onUpgrade: () -> Unit,
    onSettings: () -> Unit,
) {
    val state by vm.home.collectAsStateWithLifecycle()
    val data = state.data
    val assetLimitReached = (data?.counts?.assets ?: 0) >= LocalLimits.MAX_ASSETS

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Paper),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 14.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(
                modifier = Modifier
                    .size(40.dp)
                    .background(Forest, RoundedCornerShape(12.dp)),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    "iz",
                    style = MaterialTheme.typography.titleSmall,
                    color = Paper,
                    fontFamily = FontFamily.Serif,
                )
            }
            Spacer(Modifier.size(10.dp))
            Column(Modifier.weight(1f)) {
                Text("İZLEER", style = MaterialTheme.typography.labelMedium, color = Forest)
                Text(
                    stringResource(R.string.local_name),
                    style = MaterialTheme.typography.bodySmall,
                    color = Muted,
                )
            }
            IconButton(
                onClick = {
                    if (assetLimitReached) vm.notifyAssetLimit() else onNewAsset()
                },
            ) {
                Icon(Icons.Outlined.Add, contentDescription = stringResource(R.string.local_new_asset), tint = Forest)
            }
            IconButton(onClick = onSettings) {
                Icon(Icons.Outlined.Settings, contentDescription = stringResource(R.string.local_settings_title), tint = Forest)
            }
        }

        LazyColumn(
            contentPadding = PaddingValues(horizontal = 20.dp, vertical = 6.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
            modifier = Modifier.fillMaxSize(),
        ) {
            item {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(Forest, RoundedCornerShape(22.dp))
                        .padding(18.dp),
                ) {
                    SectionLabel(stringResource(R.string.local_home_eyebrow), light = true)
                    Text(
                        stringResource(R.string.local_home_title),
                        style = MaterialTheme.typography.headlineMedium,
                        color = Paper,
                    )
                    Spacer(Modifier.height(6.dp))
                    Text(
                        stringResource(R.string.local_home_body),
                        style = MaterialTheme.typography.bodySmall,
                        color = Paper.copy(alpha = 0.72f),
                    )
                    Spacer(Modifier.height(14.dp))
                    Surface(
                        color = Color.White.copy(alpha = 0.08f),
                        shape = RoundedCornerShape(50),
                    ) {
                        Text(
                            stringResource(R.string.local_offline_badge),
                            style = MaterialTheme.typography.labelSmall,
                            color = TerracottaPale,
                            fontWeight = FontWeight.SemiBold,
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp),
                        )
                    }
                    Spacer(Modifier.height(10.dp))
                    Text(
                        stringResource(R.string.local_plan_limits),
                        style = MaterialTheme.typography.bodySmall,
                        color = Paper.copy(alpha = 0.62f),
                    )
                }
            }

            if (state.loading && data == null) {
                item { LoadingBox() }
            }
            if (state.error != null) {
                item { ErrorBox(state.error ?: "", onRetry = { vm.refresh() }) }
            }

            if (data != null) {
                item {
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        LocalStat(
                            value = data.counts.assets.toString(),
                            label = stringResource(R.string.local_stat_assets),
                            modifier = Modifier.weight(1f),
                        )
                        LocalStat(
                            value = data.counts.entries.toString(),
                            label = stringResource(R.string.local_stat_entries),
                            modifier = Modifier.weight(1f),
                        )
                    }
                }
                item {
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        LocalStat(
                            value = data.counts.photos.toString(),
                            label = stringResource(R.string.local_stat_photos),
                            modifier = Modifier.weight(1f),
                        )
                        LocalStat(
                            value = data.counts.openReminders.toString(),
                            label = stringResource(R.string.local_stat_reminders),
                            modifier = Modifier.weight(1f),
                        )
                    }
                }

                val openReminders = data.reminders.filter { !it.done }
                item {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(top = 8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        SectionLabel(
                            stringResource(R.string.local_section_reminders),
                            modifier = Modifier.weight(1f),
                        )
                        Text(
                            stringResource(R.string.local_reminders_all),
                            style = MaterialTheme.typography.labelMedium,
                            color = Forest,
                            modifier = Modifier
                                .clickable { onOpenReminders() }
                                .padding(horizontal = 6.dp, vertical = 4.dp),
                        )
                    }
                }
                if (openReminders.isEmpty()) {
                    item {
                        Text(
                            stringResource(R.string.local_reminders_empty),
                            style = MaterialTheme.typography.bodySmall,
                            color = Muted,
                            modifier = Modifier.padding(bottom = 4.dp),
                        )
                    }
                } else {
                    items(openReminders.take(3), key = { "rem-${it.entryId}" }) { reminder ->
                        ReminderRow(reminder = reminder, onClick = { onOpenAsset(reminder.assetId) })
                    }
                }

                item {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(top = 8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        SectionLabel(
                            stringResource(R.string.local_section_assets),
                            modifier = Modifier.weight(1f),
                        )
                        Text(
                            pluralStringResource(
                                R.plurals.local_assets_count,
                                data.summaries.size,
                                data.summaries.size,
                            ),
                            style = MaterialTheme.typography.labelMedium,
                            color = Muted,
                            modifier = Modifier
                                .clickable { onOpenAssets() }
                                .padding(horizontal = 6.dp, vertical = 4.dp),
                        )
                    }
                }

                if (data.summaries.isEmpty()) {
                    item {
                        Box(
                            Modifier
                                .fillMaxWidth()
                                .background(PaperDeep, RoundedCornerShape(18.dp))
                                .padding(4.dp),
                        ) {
                            EmptyState(
                                title = stringResource(R.string.local_empty_title),
                                body = stringResource(R.string.local_empty_body),
                                actionLabel = stringResource(R.string.local_new_asset),
                                onAction = onNewAsset,
                            )
                        }
                    }
                } else {
                    items(data.summaries, key = { it.asset.id }) { summary ->
                        LocalAssetRow(
                            summary = summary,
                            coverFile = vm.mediaFile(summary.asset.coverPath),
                            onClick = { onOpenAsset(summary.asset.id) },
                        )
                    }
                }

                item {
                    Surface(
                        color = TerracottaPale,
                        shape = RoundedCornerShape(18.dp),
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(top = 6.dp)
                            .clickable { onUpgrade() },
                    ) {
                        Row(
                            modifier = Modifier.padding(16.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Icon(
                                Icons.Outlined.Cloud,
                                contentDescription = null,
                                tint = TerracottaInk,
                                modifier = Modifier.size(22.dp),
                            )
                            Spacer(Modifier.size(10.dp))
                            Column(Modifier.weight(1f)) {
                                Text(
                                    stringResource(R.string.local_upgrade_banner_title),
                                    style = MaterialTheme.typography.titleMedium,
                                    color = TerracottaInk,
                                )
                                Text(
                                    stringResource(R.string.local_upgrade_banner_body),
                                    style = MaterialTheme.typography.bodySmall,
                                    color = Muted,
                                )
                            }
                            Icon(
                                Icons.Outlined.ChevronRight,
                                contentDescription = null,
                                tint = TerracottaInk,
                            )
                        }
                    }
                }

                item {
                    Text(
                        stringResource(R.string.local_footer),
                        style = MaterialTheme.typography.bodySmall,
                        color = Muted,
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 18.dp),
                    )
                }
            }
        }
    }
}

@Composable
private fun LocalStat(value: String, label: String, modifier: Modifier = Modifier) {
    Column(
        modifier = modifier
            .background(Ivory, RoundedCornerShape(14.dp))
            .padding(horizontal = 14.dp, vertical = 12.dp),
    ) {
        Text(value, style = MaterialTheme.typography.headlineSmall, color = Forest)
        Text(
            label.uppercase(),
            style = MaterialTheme.typography.labelSmall,
            color = Muted,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
    }
}

@Composable
fun LocalAssetRow(
    summary: LocalAssetSummary,
    coverFile: java.io.File?,
    onClick: () -> Unit,
) {
    Surface(
        color = Ivory,
        shape = RoundedCornerShape(16.dp),
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() },
    ) {
        Row(
            modifier = Modifier.padding(12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            if (coverFile?.exists() == true) {
                AsyncImage(
                    model = coverFile,
                    contentDescription = summary.asset.title,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier
                        .size(58.dp)
                        .clip(RoundedCornerShape(12.dp)),
                )
            } else {
                Box(
                    modifier = Modifier
                        .size(58.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .background(TerracottaPale),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(
                        Icons.Outlined.PhotoCamera,
                        contentDescription = null,
                        tint = TerracottaInk,
                        modifier = Modifier.size(24.dp),
                    )
                }
            }
            Spacer(Modifier.size(12.dp))
            Column(Modifier.weight(1f)) {
                Text(
                    summary.asset.title,
                    style = MaterialTheme.typography.titleMedium,
                    color = Forest,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                Spacer(Modifier.height(3.dp))
                Text(
                    listOf(
                        localCategoryLabel(summary.asset.category),
                        pluralStringResource(
                            R.plurals.local_entries_count,
                            summary.entryCount,
                            summary.entryCount,
                        ),
                    ).joinToString(" · "),
                    style = MaterialTheme.typography.bodySmall,
                    color = Muted,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                val last = summary.lastEntryAt
                if (last != null) {
                    Text(
                        formatLocalDate(last),
                        style = MaterialTheme.typography.labelSmall,
                        color = Muted,
                    )
                }
            }
            Icon(Icons.Outlined.ChevronRight, contentDescription = null, tint = Muted)
        }
    }
}

@Composable
private fun ReminderRow(reminder: LocalReminder, onClick: () -> Unit) {
    Surface(
        color = PaperDeep,
        shape = RoundedCornerShape(14.dp),
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() },
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 14.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(
                modifier = Modifier
                    .size(36.dp)
                    .clip(CircleShape)
                    .background(TerracottaPale),
                contentAlignment = Alignment.Center,
            ) {
                Icon(Icons.Outlined.Alarm, contentDescription = null, tint = TerracottaInk, modifier = Modifier.size(19.dp))
            }
            Spacer(Modifier.size(10.dp))
            Column(Modifier.weight(1f)) {
                Text(
                    reminder.title?.takeIf { it.isNotBlank() } ?: reminder.assetTitle,
                    style = MaterialTheme.typography.titleSmall,
                    color = Forest,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                Text(
                    "${reminder.assetTitle} · ${formatLocalDate(reminder.dueAt, withTime = true)}",
                    style = MaterialTheme.typography.bodySmall,
                    color = Muted,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
            Icon(Icons.Outlined.ChevronRight, contentDescription = null, tint = Muted)
        }
    }
}
