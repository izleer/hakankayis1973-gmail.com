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
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
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
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Add
import androidx.compose.material.icons.outlined.ArrowDropDown
import androidx.compose.material.icons.outlined.Close
import androidx.compose.material.icons.outlined.PhotoLibrary
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Checkbox
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.RadioButton
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
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import app.varlikhafizasi.R
import app.varlikhafizasi.data.Asset
import app.varlikhafizasi.data.Entry
import app.varlikhafizasi.data.FeedPost
import app.varlikhafizasi.data.Group
import app.varlikhafizasi.data.GroupMember
import app.varlikhafizasi.data.MediaUrl
import app.varlikhafizasi.ui.Loadable
import app.varlikhafizasi.ui.VhViewModel
import app.varlikhafizasi.ui.components.AssetRow
import app.varlikhafizasi.ui.components.Avatar
import app.varlikhafizasi.ui.components.EmptyState
import app.varlikhafizasi.ui.components.ErrorBox
import app.varlikhafizasi.ui.components.FeedPostCard
import app.varlikhafizasi.ui.components.LoadingBox
import app.varlikhafizasi.ui.components.SectionLabel
import app.varlikhafizasi.ui.components.StatTile
import app.varlikhafizasi.ui.components.VhTopBar
import app.varlikhafizasi.ui.components.entryTypeLabel
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
    onOpenGroupAsset: (String) -> Unit,
    initialTab: String = "feed",
) {
    val state by vm.group.collectAsStateWithLifecycle()
    val pick by vm.groupPick.collectAsStateWithLifecycle()
    val entries by vm.groupEntries.collectAsStateWithLifecycle()
    val busy by vm.groupBusy.collectAsStateWithLifecycle()
    val startTab = initialTab.takeIf { it in setOf("feed", "assets", "members") } ?: "feed"
    var tab by rememberSaveable(slug, startTab) { mutableStateOf(startTab) }
    var confirmLeave by remember { mutableStateOf(false) }
    var shareOpen by remember { mutableStateOf(false) }
    var shareError by remember { mutableStateOf<String?>(null) }
    var removeTarget by remember { mutableStateOf<Asset?>(null) }
    var scopeTarget by remember { mutableStateOf<Asset?>(null) }
    var composerOpen by remember { mutableStateOf(false) }
    var composerError by remember { mutableStateOf<String?>(null) }
    var deleteTarget by remember { mutableStateOf<FeedPost?>(null) }

    LaunchedEffect(slug) { vm.loadGroup(slug) }
    LaunchedEffect(slug, state.data?.payload?.isMember) {
        // Grup açıldığında panel özetindeki okunmamış sayaçlar sıfırlanır.
        if (state.data?.payload?.isMember == true) vm.markGroupSeen(slug)
    }
    LaunchedEffect(shareOpen) { if (shareOpen) vm.loadGroupPickAssets() }

    val data = state.data
    val community = data?.payload?.community
    val canManage = data?.payload?.canManage == true

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

            item {
                GroupTabs(
                    selected = tab,
                    postCount = data.posts.size,
                    assetCount = data.assets.size,
                    memberCount = data.payload.members.size,
                    onSelect = { tab = it },
                )
            }

            if (tab == "feed") {
                if (!data.payload.isMember) {
                    item {
                        val pending = data.payload.membershipStatus == "pending"
                        Box(Modifier.padding(horizontal = 20.dp, vertical = 4.dp)) {
                            MembershipNote(
                                title = stringResource(
                                    if (pending) {
                                        R.string.groups_pending
                                    } else {
                                        R.string.groups_feed_locked
                                    },
                                ),
                                body = stringResource(
                                    if (pending) {
                                        R.string.groups_pending_hint
                                    } else {
                                        R.string.groups_feed_locked_body
                                    },
                                ),
                            )
                        }
                    }
                } else {
                    item {
                        ComposerPrompt(
                            onClick = {
                                composerError = null
                                vm.loadGroupAssetEntries(slug, null)
                                composerOpen = true
                            },
                        )
                    }
                    if (data.posts.isEmpty()) {
                        item {
                            Box(Modifier.padding(horizontal = 20.dp, vertical = 4.dp)) {
                                Box(
                                    Modifier
                                        .fillMaxWidth()
                                        .background(PaperDeep, RoundedCornerShape(16.dp)),
                                ) {
                                    EmptyState(
                                        title = stringResource(R.string.groups_feed_empty_title),
                                        body = stringResource(R.string.groups_feed_empty_body),
                                    )
                                }
                            }
                        }
                    } else {
                        items(data.posts, key = { "post-${it.id}" }) { post ->
                            FeedPostCard(
                                post = post,
                                onOpenAsset = onOpenGroupAsset,
                                onLike = { vm.toggleLike(post) },
                                canDelete = post.author.id == viewerId || canManage,
                                onDelete = { deleteTarget = post },
                            )
                        }
                    }
                }
            }

            if (tab == "assets") {
                item {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(start = 20.dp, end = 20.dp, top = 10.dp, bottom = 4.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        SectionLabel(
                            stringResource(R.string.groups_assets_title),
                            modifier = Modifier.weight(1f),
                        )
                        if (data.payload.isMember) {
                            Surface(
                                color = Forest,
                                shape = RoundedCornerShape(50),
                                modifier = Modifier.clickable {
                                    shareError = null
                                    shareOpen = true
                                },
                            ) {
                                Row(
                                    modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                ) {
                                    Icon(
                                        Icons.Outlined.Add,
                                        contentDescription = null,
                                        tint = Paper,
                                        modifier = Modifier.size(16.dp),
                                    )
                                    Spacer(Modifier.width(6.dp))
                                    Text(
                                        stringResource(R.string.groups_add_asset),
                                        style = MaterialTheme.typography.labelLarge,
                                        color = Paper,
                                    )
                                }
                            }
                        }
                    }
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
                    items(data.assets, key = { "asset-${it.shareId ?: it.id}" }) { asset ->
                        val owned = asset.owner?.id == viewerId
                        Column(Modifier.padding(horizontal = 20.dp, vertical = 4.dp)) {
                            // Ortak yönetimdeki varlıklar tüm üyelere açıktır; kişisel
                            // detay ekranından kayıt ekleyip düzenleyebilirler.
                            if (asset.managed || owned) {
                                AssetRow(asset = asset, onClick = { onOpenAsset(asset.id) })
                            } else {
                                // Paylaşılan varlığın hikâyesi grup kapsamıyla açılır;
                                // kişisel detay ucu üye olmayanlara kapalıdır.
                                SharedAssetRow(asset, onClick = { onOpenGroupAsset(asset.id) })
                            }
                            if (!asset.managed && (owned || canManage)) {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(top = 2.dp),
                                    horizontalArrangement = Arrangement.End,
                                    verticalAlignment = Alignment.CenterVertically,
                                ) {
                                    if (owned) {
                                        TextButton(
                                            onClick = { scopeTarget = asset },
                                            contentPadding = PaddingValues(horizontal = 8.dp),
                                        ) {
                                            Text(
                                                text = stringResource(R.string.groups_scope_label) +
                                                    ": " + scopeLabel(asset.scope),
                                                style = MaterialTheme.typography.labelMedium,
                                                color = Forest,
                                            )
                                        }
                                    }
                                    TextButton(
                                        onClick = { removeTarget = asset },
                                        contentPadding = PaddingValues(horizontal = 8.dp),
                                    ) {
                                        Text(
                                            text = stringResource(R.string.groups_remove_share),
                                            style = MaterialTheme.typography.labelMedium,
                                            color = Danger,
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }

            if (tab == "members") {
                item {
                    Column(Modifier.padding(top = 4.dp)) {
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

    if (shareOpen && data != null) {
        val sharedScopes = data.assets
            .filter { !it.managed && it.owner?.id == viewerId }
            .mapNotNull { asset -> asset.scope?.let { asset.id to it } }
            .toMap()
        ShareAssetDialog(
            groupId = data.payload.community.id,
            viewerId = viewerId,
            pick = pick,
            sharedScopes = sharedScopes,
            busy = busy,
            error = shareError,
            onDismiss = { shareOpen = false },
            onRetry = { vm.loadGroupPickAssets(force = true) },
            onSubmit = { assetId, scope ->
                vm.shareGroupAsset(slug, assetId, scope) { message ->
                    if (message == null) {
                        shareOpen = false
                    } else {
                        shareError = message
                    }
                }
            },
        )
    }

    scopeTarget?.let { asset ->
        ScopeDialog(
            asset = asset,
            busy = busy,
            onDismiss = { scopeTarget = null },
            onConfirm = { scope ->
                vm.updateGroupAssetScope(slug, asset.id, scope) { scopeTarget = null }
            },
        )
    }

    removeTarget?.let { asset ->
        AlertDialog(
            onDismissRequest = { if (!busy) removeTarget = null },
            title = { Text(stringResource(R.string.groups_remove_share_confirm_title)) },
            text = { Text(stringResource(R.string.groups_remove_share_confirm_body)) },
            confirmButton = {
                TextButton(
                    enabled = !busy,
                    onClick = {
                        removeTarget = null
                        vm.removeGroupAsset(slug, asset.id)
                    },
                ) { Text(stringResource(R.string.groups_remove_share_confirm), color = Danger) }
            },
            dismissButton = {
                TextButton(enabled = !busy, onClick = { removeTarget = null }) {
                    Text(stringResource(R.string.groups_share_cancel), color = Forest)
                }
            },
        )
    }

    if (composerOpen && data != null) {
        GroupPostComposerDialog(
            assets = data.assets.filter { it.owner?.id == viewerId },
            entries = entries,
            busy = busy,
            error = composerError,
            onDismiss = { if (!busy) composerOpen = false },
            onLoadEntries = { vm.loadGroupAssetEntries(slug, it) },
            onSubmit = { body, photos, assetId, entryId ->
                vm.createGroupPost(
                    slug = slug,
                    communityId = data.payload.community.id,
                    body = body,
                    mediaUris = photos,
                    assetId = assetId,
                    entryId = entryId,
                ) { message ->
                    if (message == null) {
                        composerOpen = false
                    } else {
                        composerError = message
                    }
                }
            },
        )
    }

    deleteTarget?.let { post ->
        AlertDialog(
            onDismissRequest = { if (!busy) deleteTarget = null },
            title = { Text(stringResource(R.string.groups_post_delete_confirm_title)) },
            text = { Text(stringResource(R.string.groups_post_delete_confirm_body)) },
            confirmButton = {
                TextButton(
                    enabled = !busy,
                    onClick = {
                        deleteTarget = null
                        vm.deleteGroupPost(slug, post.id)
                    },
                ) { Text(stringResource(R.string.groups_post_delete_confirm), color = Danger) }
            },
            dismissButton = {
                TextButton(enabled = !busy, onClick = { deleteTarget = null }) {
                    Text(stringResource(R.string.groups_share_cancel), color = Forest)
                }
            },
        )
    }
}

@Composable
private fun GroupTabs(
    selected: String,
    postCount: Int,
    assetCount: Int,
    memberCount: Int,
    onSelect: (String) -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 20.dp, vertical = 10.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        GroupTab(
            label = stringResource(R.string.groups_tab_feed),
            count = postCount,
            selected = selected == "feed",
            modifier = Modifier.weight(1f),
            onClick = { onSelect("feed") },
        )
        GroupTab(
            label = stringResource(R.string.groups_tab_assets),
            count = assetCount,
            selected = selected == "assets",
            modifier = Modifier.weight(1f),
            onClick = { onSelect("assets") },
        )
        GroupTab(
            label = stringResource(R.string.groups_tab_members),
            count = memberCount,
            selected = selected == "members",
            modifier = Modifier.weight(1f),
            onClick = { onSelect("members") },
        )
    }
}

@Composable
private fun GroupTab(
    label: String,
    count: Int,
    selected: Boolean,
    modifier: Modifier = Modifier,
    onClick: () -> Unit,
) {
    Surface(
        color = if (selected) Forest else Ivory,
        shape = RoundedCornerShape(50),
        border = BorderStroke(1.dp, if (selected) Forest else Line),
        modifier = modifier.clickable { onClick() },
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 8.dp),
            horizontalArrangement = Arrangement.Center,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                text = label,
                style = MaterialTheme.typography.labelMedium,
                color = if (selected) Paper else Forest,
                maxLines = 1,
            )
            Spacer(Modifier.width(5.dp))
            Text(
                text = count.toString(),
                style = MaterialTheme.typography.labelSmall,
                color = if (selected) Paper.copy(alpha = 0.75f) else Muted,
            )
        }
    }
}

@Composable
private fun ComposerPrompt(onClick: () -> Unit) {
    Surface(
        color = Forest,
        shape = RoundedCornerShape(16.dp),
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 20.dp, vertical = 4.dp)
            .clickable { onClick() },
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 14.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(
                modifier = Modifier
                    .size(34.dp)
                    .background(Paper.copy(alpha = 0.14f), CircleShape),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    Icons.Outlined.Add,
                    contentDescription = null,
                    tint = Paper,
                    modifier = Modifier.size(18.dp),
                )
            }
            Spacer(Modifier.width(10.dp))
            Column(Modifier.weight(1f)) {
                Text(
                    stringResource(R.string.groups_composer_prompt_title),
                    style = MaterialTheme.typography.titleSmall,
                    color = Paper,
                )
                Text(
                    stringResource(R.string.groups_composer_prompt_body),
                    style = MaterialTheme.typography.bodySmall,
                    color = Paper.copy(alpha = 0.75f),
                )
            }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun GroupPostComposerDialog(
    assets: List<Asset>,
    entries: Loadable<List<Entry>>,
    busy: Boolean,
    error: String?,
    onDismiss: () -> Unit,
    onLoadEntries: (String?) -> Unit,
    onSubmit: (String, List<Uri>, String?, String?) -> Unit,
) {
    var body by remember { mutableStateOf("") }
    var photos by remember { mutableStateOf<List<Uri>>(emptyList()) }
    var assetId by remember { mutableStateOf("") }
    var entryId by remember { mutableStateOf("") }
    var assetMenu by remember { mutableStateOf(false) }
    var entryMenu by remember { mutableStateOf(false) }

    val picker = rememberLauncherForActivityResult(
        ActivityResultContracts.GetMultipleContents(),
    ) { uris ->
        if (uris.isNotEmpty()) {
            photos = (photos + uris).take(4)
        }
    }

    val selectedAsset = assets.firstOrNull { it.id == assetId }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(stringResource(R.string.groups_composer_title)) },
        text = {
            Column(
                Modifier
                    .heightIn(max = 460.dp)
                    .verticalScroll(rememberScrollState()),
            ) {
                OutlinedTextField(
                    value = body,
                    onValueChange = { if (it.length <= 3000) body = it },
                    enabled = !busy,
                    label = { Text(stringResource(R.string.groups_composer_note)) },
                    placeholder = { Text(stringResource(R.string.groups_composer_placeholder)) },
                    minLines = 4,
                    modifier = Modifier.fillMaxWidth(),
                )

                if (assets.isNotEmpty()) {
                    Spacer(Modifier.height(12.dp))
                    Text(
                        text = stringResource(R.string.groups_composer_asset),
                        style = MaterialTheme.typography.labelMedium,
                        color = Forest,
                    )
                    Spacer(Modifier.height(6.dp))
                    Box {
                        OutlinedButton(
                            onClick = { assetMenu = true },
                            enabled = !busy,
                            shape = RoundedCornerShape(12.dp),
                            border = BorderStroke(1.dp, Line),
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            Text(
                                text = selectedAsset?.title
                                    ?: stringResource(R.string.groups_composer_asset_none),
                                color = if (selectedAsset == null) Muted else Forest,
                                style = MaterialTheme.typography.bodyMedium,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis,
                                modifier = Modifier.weight(1f),
                            )
                            Icon(
                                Icons.Outlined.ArrowDropDown,
                                contentDescription = null,
                                tint = Muted,
                            )
                        }
                        DropdownMenu(
                            expanded = assetMenu,
                            onDismissRequest = { assetMenu = false },
                            modifier = Modifier.background(Ivory),
                        ) {
                            DropdownMenuItem(
                                text = {
                                    Text(
                                        stringResource(R.string.groups_composer_asset_none),
                                        color = Muted,
                                    )
                                },
                                onClick = {
                                    assetId = ""
                                    entryId = ""
                                    assetMenu = false
                                    onLoadEntries(null)
                                },
                            )
                            assets.forEach { asset ->
                                DropdownMenuItem(
                                    text = { Text(asset.title, color = Forest) },
                                    onClick = {
                                        assetId = asset.id
                                        entryId = ""
                                        assetMenu = false
                                        onLoadEntries(asset.id)
                                    },
                                )
                            }
                        }
                    }

                    if (assetId.isNotEmpty()) {
                        Spacer(Modifier.height(12.dp))
                        Text(
                            text = stringResource(R.string.groups_composer_entry),
                            style = MaterialTheme.typography.labelMedium,
                            color = Forest,
                        )
                        Spacer(Modifier.height(6.dp))
                        val options = entries.data.orEmpty()
                        val entryLabel = options.firstOrNull { it.id == entryId }?.let { entry ->
                            "${entryTypeLabel(entry.type)} · " +
                                (entry.title ?: entry.body ?: stringResource(R.string.groups_composer_entry_untitled))
                        }
                        Box {
                            OutlinedButton(
                                onClick = { entryMenu = true },
                                enabled = !busy && !entries.loading && options.isNotEmpty(),
                                shape = RoundedCornerShape(12.dp),
                                border = BorderStroke(1.dp, Line),
                                modifier = Modifier.fillMaxWidth(),
                            ) {
                                Text(
                                    text = when {
                                        entries.loading -> stringResource(R.string.groups_composer_entry_loading)
                                        options.isEmpty() -> stringResource(R.string.groups_composer_entry_empty)
                                        entryLabel != null -> entryLabel
                                        else -> stringResource(R.string.groups_composer_entry_none)
                                    },
                                    color = if (entryLabel == null) Muted else Forest,
                                    style = MaterialTheme.typography.bodyMedium,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis,
                                    modifier = Modifier.weight(1f),
                                )
                                Icon(
                                    Icons.Outlined.ArrowDropDown,
                                    contentDescription = null,
                                    tint = Muted,
                                )
                            }
                            DropdownMenu(
                                expanded = entryMenu,
                                onDismissRequest = { entryMenu = false },
                                modifier = Modifier.background(Ivory),
                            ) {
                                DropdownMenuItem(
                                    text = {
                                        Text(
                                            stringResource(R.string.groups_composer_entry_none),
                                            color = Muted,
                                        )
                                    },
                                    onClick = {
                                        entryId = ""
                                        entryMenu = false
                                    },
                                )
                                options.forEach { entry ->
                                    DropdownMenuItem(
                                        text = {
                                            Text(
                                                "${entryTypeLabel(entry.type)} · " +
                                                    (entry.title ?: entry.body
                                                        ?: stringResource(R.string.groups_composer_entry_untitled)),
                                                color = Forest,
                                                maxLines = 1,
                                                overflow = TextOverflow.Ellipsis,
                                            )
                                        },
                                        onClick = {
                                            entryId = entry.id
                                            entryMenu = false
                                        },
                                    )
                                }
                            }
                        }
                        entries.error?.let { message ->
                            Spacer(Modifier.height(4.dp))
                            Text(
                                text = message,
                                style = MaterialTheme.typography.bodySmall,
                                color = Danger,
                            )
                        }
                    }
                }

                Spacer(Modifier.height(12.dp))
                Text(
                    text = stringResource(R.string.groups_composer_photos),
                    style = MaterialTheme.typography.labelMedium,
                    color = Forest,
                )
                Spacer(Modifier.height(6.dp))
                OutlinedButton(
                    onClick = { picker.launch("image/*") },
                    enabled = !busy && photos.size < 4,
                    shape = RoundedCornerShape(12.dp),
                    border = BorderStroke(1.dp, Line),
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Icon(
                        Icons.Outlined.PhotoLibrary,
                        contentDescription = null,
                        tint = Forest,
                        modifier = Modifier.size(18.dp),
                    )
                    Spacer(Modifier.width(8.dp))
                    Text(
                        stringResource(R.string.groups_composer_add_photo),
                        style = MaterialTheme.typography.labelMedium,
                        color = Forest,
                    )
                }

                if (photos.isNotEmpty()) {
                    Spacer(Modifier.height(10.dp))
                    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        photos.forEachIndexed { index, uri ->
                            Box(
                                modifier = Modifier
                                    .size(74.dp)
                                    .clip(RoundedCornerShape(10.dp))
                                    .background(PaperDeep),
                            ) {
                                AsyncImage(
                                    model = uri,
                                    contentDescription = null,
                                    contentScale = ContentScale.Crop,
                                    modifier = Modifier.matchParentSize(),
                                )
                                IconButton(
                                    onClick = {
                                        photos = photos.filterIndexed { i, _ -> i != index }
                                    },
                                    enabled = !busy,
                                    modifier = Modifier
                                        .align(Alignment.TopEnd)
                                        .padding(2.dp)
                                        .size(22.dp)
                                        .background(Forest.copy(alpha = 0.72f), CircleShape),
                                ) {
                                    Icon(
                                        Icons.Outlined.Close,
                                        contentDescription = stringResource(
                                            R.string.groups_composer_remove_photo,
                                        ),
                                        tint = Paper,
                                        modifier = Modifier.size(13.dp),
                                    )
                                }
                            }
                        }
                    }
                }

                error?.let { message ->
                    Spacer(Modifier.height(10.dp))
                    Text(
                        text = message,
                        style = MaterialTheme.typography.bodySmall,
                        color = Danger,
                    )
                }
            }
        },
        confirmButton = {
            TextButton(
                enabled = !busy,
                onClick = {
                    onSubmit(
                        body,
                        photos,
                        assetId.ifEmpty { null },
                        entryId.ifEmpty { null },
                    )
                },
            ) {
                Text(
                    text = stringResource(
                        if (busy) R.string.groups_composer_busy else R.string.groups_composer_submit,
                    ),
                    color = Forest,
                )
            }
        },
        dismissButton = {
            TextButton(enabled = !busy, onClick = onDismiss) {
                Text(stringResource(R.string.groups_share_cancel), color = Forest)
            }
        },
    )
}

@Composable
private fun ShareAssetDialog(
    groupId: String,
    viewerId: String,
    pick: Loadable<List<Asset>>,
    sharedScopes: Map<String, String>,
    busy: Boolean,
    error: String?,
    onDismiss: () -> Unit,
    onRetry: () -> Unit,
    onSubmit: (String, String) -> Unit,
) {
    var selectedId by remember { mutableStateOf("") }
    var scope by remember { mutableStateOf("summary") }
    var approved by remember { mutableStateOf(false) }

    val candidates = remember(pick.data, groupId, viewerId) {
        (pick.data ?: emptyList()).filter {
            it.owner?.id == viewerId && it.manager?.id != groupId
        }
    }
    val alreadyShared = selectedId.isNotEmpty() && sharedScopes.containsKey(selectedId)

    AlertDialog(
        onDismissRequest = { if (!busy) onDismiss() },
        title = { Text(stringResource(R.string.groups_share_title)) },
        text = {
            Column(
                Modifier
                    .heightIn(max = 420.dp)
                    .verticalScroll(rememberScrollState()),
            ) {
                when {
                    pick.loading && pick.data == null -> LoadingBox()
                    pick.error != null && pick.data == null -> ErrorBox(pick.error, onRetry = onRetry)
                    candidates.isEmpty() -> Text(
                        text = stringResource(R.string.groups_share_empty),
                        style = MaterialTheme.typography.bodyMedium,
                        color = Muted,
                    )
                    else -> {
                        SectionLabel(stringResource(R.string.groups_share_pick_label))
                        candidates.forEach { asset ->
                            CandidateRow(
                                asset = asset,
                                selected = asset.id == selectedId,
                                shared = sharedScopes.containsKey(asset.id),
                                onClick = {
                                    selectedId = asset.id
                                    scope = sharedScopes[asset.id] ?: "summary"
                                    approved = false
                                },
                            )
                        }
                        SectionLabel(
                            stringResource(R.string.groups_share_scope_title),
                            modifier = Modifier.padding(top = 10.dp),
                        )
                        ScopeOption(
                            selected = scope == "summary",
                            title = stringResource(R.string.groups_share_scope_summary),
                            hint = stringResource(R.string.groups_share_scope_summary_hint),
                            onClick = {
                                scope = "summary"
                                approved = false
                            },
                        )
                        ScopeOption(
                            selected = scope == "timeline",
                            title = stringResource(R.string.groups_share_scope_timeline),
                            hint = stringResource(R.string.groups_share_scope_timeline_hint),
                            onClick = {
                                scope = "timeline"
                                approved = false
                            },
                        )
                        ScopeOption(
                            selected = scope == "all",
                            title = stringResource(R.string.groups_share_scope_all),
                            hint = stringResource(R.string.groups_share_scope_all_hint),
                            onClick = { scope = "all" },
                        )
                        if (scope == "all") {
                            Spacer(Modifier.height(6.dp))
                            Text(
                                text = stringResource(R.string.groups_share_all_warning),
                                style = MaterialTheme.typography.bodySmall,
                                color = Clay,
                            )
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clickable { approved = !approved }
                                    .padding(vertical = 4.dp),
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Checkbox(checked = approved, onCheckedChange = { approved = it })
                                Text(
                                    text = stringResource(R.string.groups_share_all_approve),
                                    style = MaterialTheme.typography.bodySmall,
                                    color = Forest,
                                )
                            }
                        }
                        Spacer(Modifier.height(10.dp))
                        Text(
                            text = stringResource(R.string.groups_share_owner_note),
                            style = MaterialTheme.typography.bodySmall,
                            color = Muted,
                        )
                    }
                }
                error?.let { message ->
                    Spacer(Modifier.height(8.dp))
                    Text(
                        text = message,
                        style = MaterialTheme.typography.bodySmall,
                        color = Danger,
                    )
                }
            }
        },
        confirmButton = {
            TextButton(
                enabled = selectedId.isNotEmpty() && !busy && (scope != "all" || approved),
                onClick = { onSubmit(selectedId, scope) },
            ) {
                Text(
                    text = when {
                        busy -> stringResource(R.string.groups_share_busy)
                        alreadyShared -> stringResource(R.string.groups_share_update)
                        else -> stringResource(R.string.groups_share_submit)
                    },
                    color = Forest,
                )
            }
        },
        dismissButton = {
            TextButton(enabled = !busy, onClick = onDismiss) {
                Text(stringResource(R.string.groups_share_cancel), color = Forest)
            }
        },
    )
}

@Composable
private fun ScopeDialog(
    asset: Asset,
    busy: Boolean,
    onDismiss: () -> Unit,
    onConfirm: (String) -> Unit,
) {
    var scope by remember(asset.id) { mutableStateOf(asset.scope ?: "summary") }
    AlertDialog(
        onDismissRequest = { if (!busy) onDismiss() },
        title = { Text(stringResource(R.string.groups_scope_title)) },
        text = {
            Column(
                Modifier
                    .heightIn(max = 360.dp)
                    .verticalScroll(rememberScrollState()),
            ) {
                Text(
                    text = asset.title,
                    style = MaterialTheme.typography.titleSmall,
                    color = Forest,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.padding(bottom = 6.dp),
                )
                ScopeOption(
                    selected = scope == "summary",
                    title = stringResource(R.string.groups_share_scope_summary),
                    hint = stringResource(R.string.groups_share_scope_summary_hint),
                    onClick = { scope = "summary" },
                )
                ScopeOption(
                    selected = scope == "timeline",
                    title = stringResource(R.string.groups_share_scope_timeline),
                    hint = stringResource(R.string.groups_share_scope_timeline_hint),
                    onClick = { scope = "timeline" },
                )
                ScopeOption(
                    selected = scope == "all",
                    title = stringResource(R.string.groups_share_scope_all),
                    hint = stringResource(R.string.groups_share_scope_all_hint),
                    onClick = { scope = "all" },
                )
            }
        },
        confirmButton = {
            TextButton(enabled = !busy, onClick = { onConfirm(scope) }) {
                Text(stringResource(R.string.groups_scope_save), color = Forest)
            }
        },
        dismissButton = {
            TextButton(enabled = !busy, onClick = onDismiss) {
                Text(stringResource(R.string.groups_share_cancel), color = Forest)
            }
        },
    )
}

@Composable
private fun ScopeOption(
    selected: Boolean,
    title: String,
    hint: String,
    onClick: () -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(if (selected) SageLight else Ivory)
            .clickable { onClick() }
            .padding(horizontal = 6.dp, vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        RadioButton(selected = selected, onClick = onClick)
        Column(Modifier.weight(1f)) {
            Text(
                text = title,
                style = MaterialTheme.typography.titleSmall,
                color = Forest,
            )
            Text(
                text = hint,
                style = MaterialTheme.typography.bodySmall,
                color = Muted,
            )
        }
    }
}

@Composable
private fun CandidateRow(
    asset: Asset,
    selected: Boolean,
    shared: Boolean,
    onClick: () -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(if (selected) SageLight else Paper)
            .clickable { onClick() }
            .padding(horizontal = 6.dp, vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        RadioButton(selected = selected, onClick = onClick)
        Box(
            modifier = Modifier
                .size(40.dp)
                .clip(RoundedCornerShape(8.dp))
                .background(SageLight),
            contentAlignment = Alignment.Center,
        ) {
            val cover = MediaUrl.resolve(asset.coverUrl)
            if (cover != null) {
                AsyncImage(
                    model = cover,
                    contentDescription = null,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.matchParentSize(),
                )
            } else {
                Text(
                    text = asset.type?.label?.take(1) ?: "V",
                    style = MaterialTheme.typography.labelMedium,
                    color = SageInk,
                )
            }
        }
        Spacer(Modifier.width(10.dp))
        Column(Modifier.weight(1f)) {
            Text(
                text = asset.title,
                style = MaterialTheme.typography.titleSmall,
                color = Forest,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            Text(
                text = asset.type?.label ?: stringResource(R.string.common_asset),
                style = MaterialTheme.typography.bodySmall,
                color = Muted,
                maxLines = 1,
            )
        }
        if (shared) {
            Spacer(Modifier.width(6.dp))
            Text(
                text = stringResource(R.string.groups_share_in_group),
                style = MaterialTheme.typography.labelSmall,
                color = Clay,
            )
        }
    }
}

@Composable
internal fun scopeLabel(scope: String?): String = when (scope) {
    "all" -> stringResource(R.string.groups_share_scope_all)
    "timeline" -> stringResource(R.string.groups_share_scope_timeline)
    else -> stringResource(R.string.groups_share_scope_summary)
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
private fun SharedAssetRow(asset: Asset, onClick: () -> Unit) {
    Surface(
        color = Ivory,
        shape = RoundedCornerShape(14.dp),
        border = BorderStroke(1.dp, Line),
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
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
                    asset.scope?.let { scope ->
                        Spacer(Modifier.width(8.dp))
                        Text(
                            text = scopeLabel(scope),
                            style = MaterialTheme.typography.bodySmall,
                            color = Clay,
                            maxLines = 1,
                        )
                    }
                }
            }
        }
    }
}
