package app.varlikhafizasi.ui.screens

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
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowForward
import androidx.compose.material.icons.automirrored.outlined.MenuBook
import androidx.compose.material.icons.outlined.Add
import androidx.compose.material.icons.outlined.ChevronRight
import androidx.compose.material.icons.outlined.Eco
import androidx.compose.material.icons.outlined.Groups
import androidx.compose.material.icons.outlined.Inventory2
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import app.varlikhafizasi.R
import app.varlikhafizasi.data.Entry
import app.varlikhafizasi.data.GroupSummary
import app.varlikhafizasi.data.MediaUrl
import app.varlikhafizasi.data.User
import app.varlikhafizasi.ui.VhViewModel
import app.varlikhafizasi.ui.components.AssetRow
import app.varlikhafizasi.ui.components.EmptyState
import app.varlikhafizasi.ui.components.ErrorBox
import app.varlikhafizasi.ui.components.GoldRule
import app.varlikhafizasi.ui.components.LoadingBox
import app.varlikhafizasi.ui.components.NotificationBell
import app.varlikhafizasi.ui.components.SectionLabel
import app.varlikhafizasi.ui.components.entryTypeLabel
import app.varlikhafizasi.ui.components.formatDate
import app.varlikhafizasi.ui.theme.Clay
import app.varlikhafizasi.ui.theme.Forest
import app.varlikhafizasi.ui.theme.GoldInk
import app.varlikhafizasi.ui.theme.Ivory
import app.varlikhafizasi.ui.theme.Line
import app.varlikhafizasi.ui.theme.Muted
import app.varlikhafizasi.ui.theme.Paper
import app.varlikhafizasi.ui.theme.PaperDeep
import app.varlikhafizasi.ui.theme.Sage
import app.varlikhafizasi.ui.theme.SageInk
import app.varlikhafizasi.ui.theme.SageLight
import app.varlikhafizasi.ui.theme.TerracottaInk
import app.varlikhafizasi.ui.theme.TerracottaPale
import app.varlikhafizasi.ui.theme.TerracottaSoft
import coil.compose.AsyncImage
import java.util.Locale

@Composable
fun HomeScreen(
    vm: VhViewModel,
    viewer: User,
    onOpenAsset: (String) -> Unit,
    onOpenAssets: () -> Unit,
    onOpenArchive: () -> Unit,
    onOpenNotifications: () -> Unit,
    onNewAsset: () -> Unit,
    onOpenFriends: () -> Unit,
    onOpenGroup: (String, String) -> Unit,
    onOpenGroups: () -> Unit,
) {
    val home by vm.home.collectAsStateWithLifecycle()
    val notifications by vm.notifications.collectAsStateWithLifecycle()
    val unreadCount = notifications.data?.unreadCount ?: 0
    val groups = home.data?.groups.orEmpty()

    LaunchedEffect(Unit) {
        if (home.data == null && !home.loading) vm.loadHome()
    }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(Paper),
        contentPadding = androidx.compose.foundation.layout.PaddingValues(
            start = 20.dp,
            end = 20.dp,
            top = 14.dp,
            bottom = 28.dp,
        ),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text(
                        "İZLEER",
                        style = MaterialTheme.typography.labelSmall,
                        color = Clay,
                    )
                    Spacer(Modifier.height(3.dp))
                    Text(
                        text = stringResource(
                            R.string.home_greeting,
                            viewer.displayName.substringBefore(' '),
                        ),
                        style = MaterialTheme.typography.headlineMedium,
                        color = Forest,
                    )
                    Text(
                        stringResource(R.string.home_subtitle),
                        style = MaterialTheme.typography.bodySmall,
                        color = Muted,
                    )
                }
                NotificationBell(unreadCount = unreadCount, onClick = onOpenNotifications)
            }
        }

        item {
            Surface(
                color = Forest,
                shape = RoundedCornerShape(24.dp),
                modifier = Modifier.fillMaxWidth(),
            ) {
                Column(Modifier.padding(20.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            stringResource(R.string.home_summary_label),
                            style = MaterialTheme.typography.labelSmall,
                            color = TerracottaSoft,
                        )
                    }
                    Spacer(Modifier.height(12.dp))
                    val stats = home.data?.stats
                    Text(
                        text = if (stats != null) {
                            stringResource(
                                R.string.home_summary_stats,
                                pluralStringResource(
                                    R.plurals.home_summary_assets,
                                    stats.assets,
                                    stats.assets,
                                ),
                                pluralStringResource(
                                    R.plurals.home_summary_traces,
                                    stats.entries,
                                    stats.entries,
                                ),
                            )
                        } else {
                            stringResource(R.string.home_summary_empty)
                        },
                        style = MaterialTheme.typography.headlineLarge,
                        color = Paper,
                    )
                    Spacer(Modifier.height(16.dp))
                    GoldRule(Modifier.background(TerracottaSoft))
                    Spacer(Modifier.height(16.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        DarkStat(
                            value = stats?.assets?.toString() ?: "—",
                            label = stringResource(R.string.profile_stat_assets),
                            modifier = Modifier.weight(1f),
                        )
                        DarkStat(
                            value = stats?.entries?.toString() ?: "—",
                            label = stringResource(R.string.profile_stat_entries),
                            modifier = Modifier.weight(1f),
                        )
                        DarkStat(
                            value = stats?.media?.toString() ?: "—",
                            label = stringResource(R.string.home_stat_media),
                            modifier = Modifier.weight(1f),
                        )
                    }
                }
            }
        }

        item {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Surface(
                    color = Forest,
                    shape = RoundedCornerShape(50),
                    modifier = Modifier
                        .weight(1f)
                        .clickable { onNewAsset() },
                ) {
                    Row(
                        Modifier.padding(vertical = 12.dp),
                        horizontalArrangement = Arrangement.Center,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text(
                            stringResource(R.string.home_new_asset),
                            style = MaterialTheme.typography.labelLarge,
                            color = Color.White,
                        )
                        Spacer(Modifier.size(6.dp))
                        Icon(
                            Icons.AutoMirrored.Outlined.ArrowForward,
                            contentDescription = null,
                            tint = Color.White,
                            modifier = Modifier.size(15.dp),
                        )
                    }
                }
                Surface(
                    color = Color.Transparent,
                    shape = RoundedCornerShape(50),
                    border = BorderStroke(1.dp, TerracottaSoft),
                    modifier = Modifier
                        .weight(1f)
                        .clickable { onOpenArchive() },
                ) {
                    Text(
                        stringResource(R.string.home_open_archive),
                        style = MaterialTheme.typography.labelLarge,
                        color = TerracottaInk,
                        modifier = Modifier.padding(vertical = 12.dp),
                        textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                    )
                }
            }
        }

        if (groups.isNotEmpty()) {
            item {
                Spacer(Modifier.height(6.dp))
                Row(verticalAlignment = Alignment.Bottom) {
                    Column(Modifier.weight(1f)) {
                        Text(
                            stringResource(R.string.home_groups_label),
                            style = MaterialTheme.typography.labelSmall,
                            color = TerracottaInk,
                        )
                        Spacer(Modifier.height(2.dp))
                        Text(
                            stringResource(R.string.home_groups_title),
                            style = MaterialTheme.typography.headlineSmall,
                            color = Forest,
                        )
                    }
                    Text(
                        stringResource(R.string.home_groups_all),
                        style = MaterialTheme.typography.labelLarge,
                        color = Clay,
                        modifier = Modifier
                            .clickable { onOpenGroups() }
                            .padding(bottom = 4.dp),
                    )
                }
                Spacer(Modifier.height(10.dp))
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    groups.take(4).forEach { group ->
                        GroupSummaryCard(
                            group = group,
                            onOpenFeed = { onOpenGroup(group.slug, "feed") },
                            onOpenAssets = { onOpenGroup(group.slug, "assets") },
                        )
                    }
                }
            }
        }

        item {
            Surface(
                color = Ivory,
                shape = RoundedCornerShape(16.dp),
                border = BorderStroke(1.dp, Line),
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { onOpenFriends() },
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 14.dp, vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Box(
                        modifier = Modifier
                            .size(38.dp)
                            .background(TerracottaPale, CircleShape),
                        contentAlignment = Alignment.Center,
                    ) {
                        Icon(
                            Icons.Outlined.Groups,
                            contentDescription = null,
                            tint = TerracottaInk,
                            modifier = Modifier.size(19.dp),
                        )
                    }
                    Spacer(Modifier.width(11.dp))
                    Column(Modifier.weight(1f)) {
                        Text(
                            stringResource(R.string.home_friends_title),
                            style = MaterialTheme.typography.titleMedium,
                            color = Forest,
                        )
                        Text(
                            stringResource(R.string.home_friends_body),
                            style = MaterialTheme.typography.bodySmall,
                            color = Muted,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                        )
                    }
                    val friendCount = home.data?.stats?.friends ?: 0
                    if (friendCount > 0) {
                        Text(
                            friendCount.toString(),
                            style = MaterialTheme.typography.titleLarge,
                            color = Clay,
                        )
                        Spacer(Modifier.width(2.dp))
                    }
                    Icon(
                        Icons.Outlined.ChevronRight,
                        contentDescription = null,
                        tint = Muted,
                        modifier = Modifier.size(18.dp),
                    )
                }
            }
        }

        if (home.error != null) {
            item { ErrorBox(home.error ?: "", onRetry = { vm.loadHome() }) }
        }
        if (home.loading && home.data == null) {
            item { LoadingBox() }
        }

        val assets = home.data?.assets.orEmpty()
        item {
            Row(verticalAlignment = Alignment.Bottom) {
                SectionLabel(stringResource(R.string.profile_assets_title))
                Spacer(Modifier.weight(1f))
                Text(
                    stringResource(R.string.home_see_all),
                    style = MaterialTheme.typography.labelLarge,
                    color = Clay,
                    modifier = Modifier
                        .clickable { onOpenAssets() }
                        .padding(bottom = 6.dp),
                )
            }
        }

        if (!home.loading && home.data != null && assets.isEmpty()) {
            item {
                Surface(
                    color = Ivory,
                    shape = RoundedCornerShape(16.dp),
                    border = BorderStroke(1.dp, Line),
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    EmptyState(
                        title = stringResource(R.string.home_empty_title),
                        body = stringResource(R.string.home_empty_body),
                        actionLabel = stringResource(R.string.home_new_asset),
                        onAction = onNewAsset,
                    )
                }
            }
        }

        items(assets.take(5), key = { it.id }) { asset ->
            AssetRow(asset = asset, onClick = { onOpenAsset(asset.id) })
        }

        val recent = home.data?.stats?.recentEntries.orEmpty()
        if (recent.isNotEmpty()) {
            item {
                Spacer(Modifier.height(8.dp))
                SectionLabel(stringResource(R.string.home_recent_title))
            }
            items(recent.take(5), key = { it.id }) { entry ->
                RecentEntry(entry = entry, onClick = { onOpenAsset(entry.assetId) })
            }
        }

        item {
            Spacer(Modifier.height(10.dp))
            Surface(
                color = PaperDeep,
                shape = RoundedCornerShape(16.dp),
                modifier = Modifier.fillMaxWidth(),
            ) {
                Column(Modifier.padding(18.dp)) {
                    Text(
                        stringResource(R.string.home_quote),
                        style = MaterialTheme.typography.titleLarge,
                        color = Forest,
                    )
                    Spacer(Modifier.height(8.dp))
                    Text(
                        stringResource(R.string.home_quote_attribution),
                        style = MaterialTheme.typography.labelSmall,
                        color = Muted,
                    )
                }
            }
        }
    }
}

@Composable
private fun DarkStat(value: String, label: String, modifier: Modifier = Modifier) {
    Column(
        modifier = modifier
            .background(Paper.copy(alpha = 0.07f), RoundedCornerShape(10.dp))
            .padding(horizontal = 10.dp, vertical = 9.dp),
    ) {
        Text(
            value,
            style = MaterialTheme.typography.headlineSmall,
            color = Paper,
        )
        Text(
            label.uppercase(),
            style = MaterialTheme.typography.labelSmall,
            color = Sage,
        )
    }
}

private val groupSummaryTones = listOf(
    SageLight to SageInk,
    TerracottaPale to TerracottaInk,
    PaperDeep to Color(0xFF6B5A3A),
    Color(0xFFE7EAE1) to Color(0xFF55604C),
    Color(0xFFF3EAD0) to GoldInk,
)

/** Kapak olmayan gruplar için isimden türeyen, kararlı bir görsel kimlik. */
private fun GroupSummary.mark(): String {
    val words = name.trim()
        .split(Regex("\\s+"))
        .filter { it.isNotBlank() && !it.equals("ve", ignoreCase = true) }
    return words.take(2)
        .mapNotNull { it.firstOrNull()?.toString() }
        .joinToString("")
        .uppercase(Locale.getDefault())
        .ifBlank { "G" }
}

private fun GroupSummary.tone(): Pair<Color, Color> =
    groupSummaryTones[(id.hashCode() and Int.MAX_VALUE) % groupSummaryTones.size]

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun GroupSummaryCard(
    group: GroupSummary,
    onOpenFeed: () -> Unit,
    onOpenAssets: () -> Unit,
) {
    val activity = group.unreadPosts + group.addedAssets + group.removedAssets
    val (toneBackground, toneContent) = group.tone()
    val cover = MediaUrl.resolve(group.coverUrl)
    val locale = Locale.getDefault()

    Surface(
        color = Ivory,
        shape = RoundedCornerShape(14.dp),
        border = BorderStroke(
            1.dp,
            if (activity > 0) TerracottaSoft.copy(alpha = 0.65f) else Line,
        ),
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onOpenFeed),
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 9.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(
                modifier = Modifier
                    .size(58.dp)
                    .clip(RoundedCornerShape(11.dp))
                    .background(toneBackground),
                contentAlignment = Alignment.Center,
            ) {
                // Kapak yüklenemezse altındaki baş harfler görünür kalsın.
                Text(
                    text = group.mark(),
                    style = MaterialTheme.typography.titleLarge,
                    color = toneContent,
                )
                if (cover != null) {
                    AsyncImage(
                        model = cover,
                        contentDescription = null,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier.matchParentSize(),
                    )
                }
                if (activity > 0) {
                    Box(
                        modifier = Modifier
                            .align(Alignment.TopEnd)
                            .padding(4.dp)
                            .size(18.dp)
                            .clip(CircleShape)
                            .background(Clay),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(
                            text = if (activity > 99) "99+" else activity.toString(),
                            style = MaterialTheme.typography.labelSmall.copy(
                                fontSize = 9.sp,
                                lineHeight = 10.sp,
                                letterSpacing = 0.sp,
                            ),
                            color = Paper,
                        )
                    }
                }
            }

            Spacer(Modifier.width(11.dp))

            Column(Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = group.name,
                        style = MaterialTheme.typography.titleMedium,
                        color = Forest,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.weight(1f),
                    )
                    Spacer(Modifier.width(3.dp))
                    Icon(
                        Icons.Outlined.ChevronRight,
                        contentDescription = null,
                        tint = Muted,
                        modifier = Modifier.size(15.dp),
                    )
                }
                Spacer(Modifier.height(5.dp))
                FlowRow(
                    horizontalArrangement = Arrangement.spacedBy(5.dp),
                    verticalArrangement = Arrangement.spacedBy(4.dp),
                ) {
                    SummaryChip(
                        icon = Icons.Outlined.Groups,
                        text = pluralStringResource(
                            R.plurals.groups_member_count,
                            group.memberCount,
                            group.memberCount,
                        ),
                        background = Paper,
                        content = Muted,
                    )
                    if (group.unreadPosts > 0) {
                        SummaryChip(
                            icon = Icons.AutoMirrored.Outlined.MenuBook,
                            text = "${group.unreadPosts} " +
                                stringResource(R.string.home_groups_unread).lowercase(locale),
                            background = TerracottaPale,
                            content = TerracottaInk,
                            onClick = onOpenFeed,
                        )
                    }
                    if (group.addedAssets > 0) {
                        SummaryChip(
                            icon = Icons.Outlined.Add,
                            text = "+${group.addedAssets} " +
                                stringResource(R.string.home_groups_added).lowercase(locale),
                            background = SageLight,
                            content = SageInk,
                            onClick = onOpenAssets,
                        )
                    }
                    if (group.removedAssets > 0) {
                        SummaryChip(
                            icon = Icons.Outlined.Inventory2,
                            text = "−${group.removedAssets} " +
                                stringResource(R.string.home_groups_removed).lowercase(locale),
                            background = PaperDeep,
                            content = Muted,
                            onClick = onOpenAssets,
                        )
                    }
                    if (activity == 0) {
                        SummaryChip(
                            icon = Icons.Outlined.Eco,
                            text = stringResource(R.string.home_groups_idle),
                            background = Color.Transparent,
                            content = Muted,
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun SummaryChip(
    icon: ImageVector,
    text: String,
    background: Color,
    content: Color,
    onClick: (() -> Unit)? = null,
) {
    Row(
        modifier = Modifier
            .then(if (onClick != null) Modifier.clickable(onClick = onClick) else Modifier)
            .clip(RoundedCornerShape(50))
            .background(background)
            .padding(horizontal = 7.dp, vertical = 3.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(3.dp),
    ) {
        Icon(
            icon,
            contentDescription = null,
            tint = content.copy(alpha = 0.8f),
            modifier = Modifier.size(11.dp),
        )
        Text(
            text = text,
            style = MaterialTheme.typography.labelSmall.copy(letterSpacing = 0.1.sp),
            color = content,
            maxLines = 1,
        )
    }
}

@Composable
private fun RecentEntry(entry: Entry, onClick: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() }
            .padding(vertical = 6.dp),
        verticalAlignment = Alignment.Top,
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier.padding(top = 4.dp),
        ) {
            Box(
                Modifier
                    .size(9.dp)
                    .background(Clay, CircleShape),
            )
            Box(
                Modifier
                    .size(width = 1.dp, height = 46.dp)
                    .background(Line),
            )
        }
        Spacer(Modifier.size(12.dp))
        Column(Modifier.weight(1f)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    entryTypeLabel(entry.type).uppercase(),
                    style = MaterialTheme.typography.labelSmall,
                    color = Clay,
                )
                Spacer(Modifier.weight(1f))
                Text(
                    formatDate(entry.occurredAt),
                    style = MaterialTheme.typography.bodySmall,
                    color = Muted,
                )
            }
            Spacer(Modifier.height(3.dp))
            Text(
                text = entry.title ?: entry.asset?.title
                    ?: stringResource(R.string.home_entry_fallback),
                style = MaterialTheme.typography.titleMedium,
                color = Forest,
                fontWeight = FontWeight.SemiBold,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
            )
            if (!entry.body.isNullOrBlank()) {
                Text(
                    entry.body ?: "",
                    style = MaterialTheme.typography.bodySmall,
                    color = Muted,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )
            }
            Text(
                text = entry.asset?.title ?: stringResource(R.string.common_asset),
                style = MaterialTheme.typography.labelSmall,
                color = SageInk,
                modifier = Modifier.padding(top = 3.dp),
            )
        }
    }
}
