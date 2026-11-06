package app.varlikhafizasi.ui.screens

import androidx.compose.foundation.BorderStroke
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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import app.varlikhafizasi.R
import app.varlikhafizasi.data.Asset
import app.varlikhafizasi.data.Group
import app.varlikhafizasi.data.GroupMember
import app.varlikhafizasi.data.MediaUrl
import app.varlikhafizasi.ui.VhViewModel
import app.varlikhafizasi.ui.components.AssetRow
import app.varlikhafizasi.ui.components.Avatar
import app.varlikhafizasi.ui.components.EmptyState
import app.varlikhafizasi.ui.components.ErrorBox
import app.varlikhafizasi.ui.components.LoadingBox
import app.varlikhafizasi.ui.components.SectionLabel
import app.varlikhafizasi.ui.components.StatTile
import app.varlikhafizasi.ui.components.VhTopBar
import app.varlikhafizasi.ui.theme.Clay
import app.varlikhafizasi.ui.theme.Danger
import app.varlikhafizasi.ui.theme.Forest
import app.varlikhafizasi.ui.theme.Ivory
import app.varlikhafizasi.ui.theme.Line
import app.varlikhafizasi.ui.theme.Muted
import app.varlikhafizasi.ui.theme.Paper
import app.varlikhafizasi.ui.theme.PaperDeep
import app.varlikhafizasi.ui.theme.SageInk
import app.varlikhafizasi.ui.theme.SageLight
import coil.compose.AsyncImage

@Composable
fun GroupDetailScreen(
    vm: VhViewModel,
    slug: String,
    viewerId: String,
    onBack: () -> Unit,
    onOpenAsset: (String) -> Unit,
) {
    val state by vm.group.collectAsStateWithLifecycle()
    val busy by vm.groupBusy.collectAsStateWithLifecycle()
    var confirmLeave by remember { mutableStateOf(false) }

    LaunchedEffect(slug) { vm.loadGroup(slug) }

    val data = state.data
    val community = data?.payload?.community

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(Paper),
        contentPadding = PaddingValues(bottom = 28.dp),
    ) {
        item {
            VhTopBar(
                title = community?.name ?: stringResource(R.string.nav_groups),
                subtitle = community?.category,
                onBack = onBack,
            )
        }

        if (state.loading && data == null) item { LoadingBox() }
        if (state.error != null) {
            item {
                Box(Modifier.padding(horizontal = 20.dp)) {
                    ErrorBox(state.error ?: "", onRetry = { vm.loadGroup(slug) })
                }
            }
        }

        if (data != null) {
            val community = data.payload.community
            item { GroupCover(community) }

            item {
                Column(Modifier.padding(horizontal = 20.dp, vertical = 12.dp)) {
                    if (!community.description.isNullOrBlank()) {
                        Text(
                            text = community.description ?: "",
                            style = MaterialTheme.typography.bodyMedium,
                            color = Muted,
                        )
                        Spacer(Modifier.height(8.dp))
                    }
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        if (community.visibility == "private") {
                            GroupTag(stringResource(R.string.groups_visibility_private))
                            Spacer(Modifier.width(6.dp))
                        }
                        GroupTag(
                            stringResource(
                                if (community.joinPolicy == "approval") {
                                    R.string.groups_join_policy_approval
                                } else {
                                    R.string.groups_join_policy_open
                                },
                            ),
                        )
                        val role = roleLabel(community.role)
                        if (role != null) {
                            Spacer(Modifier.width(6.dp))
                            RoleTag(role)
                        }
                    }
                    community.owner?.let { owner ->
                        Spacer(Modifier.height(10.dp))
                        Text(
                            text = stringResource(R.string.groups_owner_by, owner.displayName),
                            style = MaterialTheme.typography.bodySmall,
                            color = Muted,
                        )
                    }
                }
            }

            item {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 20.dp),
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    StatTile(
                        value = community.memberCount.toString(),
                        label = stringResource(R.string.groups_stat_members),
                        modifier = Modifier.weight(1f),
                    )
                    StatTile(
                        value = community.postCount.toString(),
                        label = stringResource(R.string.groups_stat_posts),
                        modifier = Modifier.weight(1f),
                    )
                    StatTile(
                        value = community.assetCount.toString(),
                        label = stringResource(R.string.groups_stat_assets),
                        modifier = Modifier.weight(1f),
                    )
                }
            }

            item {
                val payload = data.payload
                Box(Modifier.padding(horizontal = 20.dp, vertical = 14.dp)) {
                    when {
                        payload.isOwner -> MembershipNote(
                            title = stringResource(R.string.groups_role_owner),
                            body = null,
                        )
                        payload.membershipStatus == "pending" -> MembershipNote(
                            title = stringResource(R.string.groups_pending),
                            body = stringResource(R.string.groups_pending_hint),
                        )
                        payload.isMember -> LeaveButton(
                            busy = busy,
                            onClick = { confirmLeave = true },
                        )
                        else -> JoinButton(
                            busy = busy,
                            onClick = { vm.joinGroup(slug) },
                        )
                    }
                }
            }

            if (!community.rules.isNullOrBlank()) {
                item {
                    Column(Modifier.padding(horizontal = 20.dp, vertical = 4.dp)) {
                        SectionLabel(stringResource(R.string.groups_rules_title))
                        Surface(
                            color = Ivory,
                            shape = RoundedCornerShape(14.dp),
                            border = BorderStroke(1.dp, Line),
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            Text(
                                text = community.rules ?: "",
                                style = MaterialTheme.typography.bodyMedium,
                                color = Forest,
                                modifier = Modifier.padding(14.dp),
                            )
                        }
                    }
                }
            }

            if (data.payload.members.isNotEmpty()) {
                item {
                    Column(Modifier.padding(top = 16.dp)) {
                        SectionLabel(
                            stringResource(R.string.groups_members_title),
                            modifier = Modifier.padding(horizontal = 20.dp),
                        )
                        LazyRow(
                            contentPadding = PaddingValues(horizontal = 20.dp),
                            horizontalArrangement = Arrangement.spacedBy(10.dp),
                        ) {
                            items(data.payload.members, key = { it.user.id }) { member ->
                                MemberChip(member)
                            }
                        }
                    }
                }
            }

            item {
                SectionLabel(
                    stringResource(R.string.groups_assets_title),
                    modifier = Modifier.padding(start = 20.dp, end = 20.dp, top = 18.dp, bottom = 4.dp),
                )
            }

            if (!data.payload.isMember) {
                item {
                    Box(Modifier.padding(horizontal = 20.dp)) {
                        MembershipNote(
                            title = stringResource(R.string.groups_assets_locked),
                            body = null,
                        )
                    }
                }
            } else if (data.assets.isEmpty()) {
                item {
                    Box(Modifier.padding(horizontal = 20.dp)) {
                        Box(
                            Modifier
                                .fillMaxWidth()
                                .background(PaperDeep, RoundedCornerShape(16.dp)),
                        ) {
                            EmptyState(
                                title = stringResource(R.string.groups_assets_empty),
                                body = "",
                            )
                        }
                    }
                }
            } else {
                items(data.assets, key = { "asset-${it.id}" }) { asset ->
                    Box(Modifier.padding(horizontal = 20.dp, vertical = 4.dp)) {
                        if (asset.owner?.id == viewerId) {
                            AssetRow(asset = asset, onClick = { onOpenAsset(asset.id) })
                        } else {
                            SharedAssetRow(asset)
                        }
                    }
                }
            }
        }
    }

    if (confirmLeave) {
        AlertDialog(
            onDismissRequest = { confirmLeave = false },
            title = { Text(stringResource(R.string.groups_leave_confirm_title)) },
            text = { Text(stringResource(R.string.groups_leave_confirm_body)) },
            confirmButton = {
                TextButton(onClick = {
                    confirmLeave = false
                    vm.leaveGroup(slug)
                }) { Text(stringResource(R.string.groups_leave_confirm), color = Danger) }
            },
            dismissButton = {
                TextButton(onClick = { confirmLeave = false }) {
                    Text(stringResource(R.string.groups_leave_cancel), color = Forest)
                }
            },
        )
    }
}

@Composable
private fun GroupCover(group: Group) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 20.dp)
            .height(168.dp)
            .clip(RoundedCornerShape(20.dp))
            .background(SageLight),
        contentAlignment = Alignment.Center,
    ) {
        val cover = MediaUrl.resolve(group.coverUrl)
        if (cover != null) {
            AsyncImage(
                model = cover,
                contentDescription = group.name,
                contentScale = ContentScale.Crop,
                modifier = Modifier.matchParentSize(),
            )
        } else {
            Text(
                text = group.name.trim().firstOrNull()?.uppercaseChar()?.toString() ?: "G",
                style = MaterialTheme.typography.displayMedium,
                color = SageInk,
            )
        }
    }
}

@Composable
private fun GroupTag(text: String) {
    Surface(shape = RoundedCornerShape(4.dp), color = SageLight) {
        Text(
            text = text,
            style = MaterialTheme.typography.labelSmall,
            color = Forest,
            modifier = Modifier.padding(horizontal = 7.dp, vertical = 3.dp),
        )
    }
}

@Composable
private fun MembershipNote(title: String, body: String?) {
    Surface(
        color = PaperDeep,
        shape = RoundedCornerShape(14.dp),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(Modifier.padding(14.dp)) {
            Text(
                text = title,
                style = MaterialTheme.typography.titleSmall,
                color = Forest,
            )
            if (!body.isNullOrBlank()) {
                Spacer(Modifier.height(4.dp))
                Text(
                    text = body,
                    style = MaterialTheme.typography.bodySmall,
                    color = Muted,
                )
            }
        }
    }
}

@Composable
private fun JoinButton(busy: Boolean, onClick: () -> Unit) {
    Surface(
        color = Forest,
        shape = RoundedCornerShape(50),
        modifier = Modifier
            .fillMaxWidth()
            .then(if (busy) Modifier else Modifier.clickable { onClick() }),
    ) {
        Text(
            text = stringResource(
                if (busy) R.string.groups_join_busy else R.string.groups_join,
            ),
            style = MaterialTheme.typography.labelLarge,
            color = Paper,
            textAlign = TextAlign.Center,
            modifier = Modifier.padding(vertical = 13.dp),
        )
    }
}

@Composable
private fun LeaveButton(busy: Boolean, onClick: () -> Unit) {
    Surface(
        color = Ivory,
        shape = RoundedCornerShape(50),
        border = BorderStroke(1.dp, Line),
        modifier = Modifier
            .fillMaxWidth()
            .then(if (busy) Modifier else Modifier.clickable { onClick() }),
    ) {
        Text(
            text = stringResource(R.string.groups_leave),
            style = MaterialTheme.typography.labelLarge,
            color = Danger,
            textAlign = TextAlign.Center,
            modifier = Modifier.padding(vertical = 13.dp),
        )
    }
}

@Composable
private fun MemberChip(member: GroupMember) {
    Column(
        modifier = Modifier.width(84.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Avatar(member.user.displayName, member.user.avatarUrl, size = 44.dp)
        Spacer(Modifier.height(6.dp))
        Text(
            text = member.user.displayName,
            style = MaterialTheme.typography.titleSmall,
            color = Forest,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            textAlign = TextAlign.Center,
        )
        val role = roleLabel(member.role)
        if (role != null) {
            Text(
                text = role,
                style = MaterialTheme.typography.labelSmall,
                color = Clay,
                maxLines = 1,
            )
        }
    }
}

@Composable
private fun SharedAssetRow(asset: Asset) {
    Surface(
        color = Ivory,
        shape = RoundedCornerShape(14.dp),
        border = BorderStroke(1.dp, Line),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(
                modifier = Modifier
                    .size(width = 92.dp, height = 92.dp)
                    .background(SageLight),
            ) {
                val cover = MediaUrl.resolve(asset.coverUrl)
                if (cover != null) {
                    AsyncImage(
                        model = cover,
                        contentDescription = asset.title,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier.size(width = 92.dp, height = 92.dp),
                    )
                } else {
                    Text(
                        text = asset.type?.label?.take(1) ?: "V",
                        style = MaterialTheme.typography.headlineMedium,
                        color = SageInk,
                        modifier = Modifier.align(Alignment.Center),
                    )
                }
            }
            Column(Modifier.padding(horizontal = 14.dp, vertical = 10.dp)) {
                Text(
                    text = asset.type?.label ?: stringResource(R.string.common_asset),
                    style = MaterialTheme.typography.labelSmall,
                    color = Clay,
                )
                Spacer(Modifier.height(3.dp))
                Text(
                    text = asset.title,
                    style = MaterialTheme.typography.titleLarge,
                    color = Forest,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )
                Spacer(Modifier.height(6.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = pluralStringResource(
                            R.plurals.common_entry_count,
                            asset.entryCount,
                            asset.entryCount,
                        ),
                        style = MaterialTheme.typography.bodySmall,
                        color = Muted,
                    )
                    asset.owner?.let { owner ->
                        Spacer(Modifier.width(8.dp))
                        Text(
                            text = "@${owner.username}",
                            style = MaterialTheme.typography.bodySmall,
                            color = Muted,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                        )
                    }
                }
            }
        }
    }
}
