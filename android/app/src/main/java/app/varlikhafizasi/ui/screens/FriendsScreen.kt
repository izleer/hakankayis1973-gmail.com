package app.varlikhafizasi.ui.screens

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
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.ChevronRight
import androidx.compose.material.icons.outlined.Close
import androidx.compose.material.icons.outlined.Search
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
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import app.varlikhafizasi.R
import app.varlikhafizasi.data.Asset
import app.varlikhafizasi.data.Friend
import app.varlikhafizasi.data.FriendRequest
import app.varlikhafizasi.data.MediaUrl
import app.varlikhafizasi.data.User
import app.varlikhafizasi.ui.VhViewModel
import app.varlikhafizasi.ui.components.Avatar
import app.varlikhafizasi.ui.components.EmptyState
import app.varlikhafizasi.ui.components.ErrorBox
import app.varlikhafizasi.ui.components.LoadingBox
import app.varlikhafizasi.ui.components.Pill
import app.varlikhafizasi.ui.components.SectionLabel
import app.varlikhafizasi.ui.components.VisibilityTag
import app.varlikhafizasi.ui.components.VhTopBar
import app.varlikhafizasi.ui.components.formatDate
import app.varlikhafizasi.ui.theme.Clay
import app.varlikhafizasi.ui.theme.Danger
import app.varlikhafizasi.ui.theme.Forest
import app.varlikhafizasi.ui.theme.Gold
import app.varlikhafizasi.ui.theme.Ivory
import app.varlikhafizasi.ui.theme.Line
import app.varlikhafizasi.ui.theme.Muted
import app.varlikhafizasi.ui.theme.Paper
import app.varlikhafizasi.ui.theme.PaperDeep
import app.varlikhafizasi.ui.theme.Sage
import app.varlikhafizasi.ui.theme.SageInk
import app.varlikhafizasi.ui.theme.SageLight
import coil.compose.AsyncImage

private const val TAB_FRIENDS = "friends"
private const val TAB_REQUESTS = "requests"
private const val TAB_SUGGESTIONS = "suggestions"
private const val TAB_ASSETS = "assets"

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun FriendsScreen(
    vm: VhViewModel,
    onBack: () -> Unit,
    onOpenAsset: (String) -> Unit,
) {
    val state by vm.friends.collectAsStateWithLifecycle()
    val busy by vm.friendsBusy.collectAsStateWithLifecycle()
    var tab by rememberSaveable { mutableStateOf(TAB_FRIENDS) }
    var query by rememberSaveable { mutableStateOf("") }
    var relation by rememberSaveable { mutableStateOf("") }
    var removeTarget by remember { mutableStateOf<Friend?>(null) }

    val data = state.data
    val pendingCount = (data?.incoming?.size ?: 0) + (data?.outgoing?.size ?: 0)

    LaunchedEffect(Unit) { vm.loadFriends() }

    fun search() {
        vm.loadFriends(query = query, showSpinner = false)
    }

    fun switchTab(next: String) {
        tab = next
        if (next == TAB_SUGGESTIONS || next == TAB_ASSETS) {
            if (data == null || !state.loading) vm.loadFriends(showSpinner = false)
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Paper),
    ) {
        LazyColumn(
            contentPadding = PaddingValues(bottom = 28.dp),
        ) {
            item {
                VhTopBar(
                    title = stringResource(R.string.friends_title),
                    subtitle = stringResource(R.string.friends_eyebrow),
                    onBack = onBack,
                )
            }

            item {
                Surface(
                    color = Forest,
                    shape = RoundedCornerShape(22.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 20.dp),
                ) {
                    Column(Modifier.padding(18.dp)) {
                        Text(
                            stringResource(R.string.friends_mutual),
                            style = MaterialTheme.typography.labelSmall,
                            color = Gold,
                        )
                        Spacer(Modifier.height(8.dp))
                        Text(
                            stringResource(R.string.friends_intro),
                            style = MaterialTheme.typography.bodySmall,
                            color = Paper.copy(alpha = 0.78f),
                        )
                        Spacer(Modifier.height(14.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            HeroStat(
                                value = data?.friends?.size?.toString() ?: "—",
                                label = stringResource(R.string.friends_stat_friends),
                                modifier = Modifier.weight(1f),
                            )
                            HeroStat(
                                value = pendingCount.toString(),
                                label = stringResource(R.string.friends_stat_requests),
                                modifier = Modifier.weight(1f),
                            )
                            HeroStat(
                                value = data?.shared?.size?.toString() ?: "—",
                                label = stringResource(R.string.friends_stat_shared),
                                modifier = Modifier.weight(1f),
                            )
                        }
                    }
                }
            }

            item {
                FlowRow(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Modifier.padding(horizontal = 20.dp, vertical = 14.dp),
                ) {
                    Pill(
                        text = tabLabel(R.string.friends_tab_friends, data?.friends?.size),
                        selected = tab == TAB_FRIENDS,
                        onClick = { switchTab(TAB_FRIENDS) },
                    )
                    Pill(
                        text = tabLabel(R.string.friends_tab_requests, pendingCount),
                        selected = tab == TAB_REQUESTS,
                        onClick = { switchTab(TAB_REQUESTS) },
                    )
                    Pill(
                        text = tabLabel(R.string.friends_tab_suggestions, data?.suggestions?.size),
                        selected = tab == TAB_SUGGESTIONS,
                        onClick = { switchTab(TAB_SUGGESTIONS) },
                    )
                    Pill(
                        text = tabLabel(R.string.friends_tab_assets, data?.shared?.size),
                        selected = tab == TAB_ASSETS,
                        onClick = { switchTab(TAB_ASSETS) },
                    )
                }
            }

            if (state.loading && data == null) {
                item { LoadingBox() }
            }
            if (state.error != null && data == null) {
                item {
                    Box(Modifier.padding(horizontal = 20.dp)) {
                        ErrorBox(state.error ?: "", onRetry = { vm.loadFriends() })
                    }
                }
            }

            when (tab) {
                TAB_FRIENDS -> {
                    val friends = data?.friends.orEmpty()
                    if (data != null && friends.isEmpty()) {
                        item {
                            Surface(
                                color = Ivory,
                                shape = RoundedCornerShape(16.dp),
                                border = BorderStroke(1.dp, Line),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(horizontal = 20.dp),
                            ) {
                                EmptyState(
                                    title = stringResource(R.string.friends_empty_title),
                                    body = stringResource(R.string.friends_empty_body),
                                    actionLabel = stringResource(R.string.friends_empty_action),
                                    onAction = { switchTab(TAB_SUGGESTIONS) },
                                )
                            }
                        }
                    }
                    items(friends, key = { it.id }) { friend ->
                        FriendCard(
                            friend = friend,
                            busy = busy,
                            onRemove = { removeTarget = friend },
                        )
                    }
                }

                TAB_REQUESTS -> {
                    item {
                        SectionLabel(
                            stringResource(R.string.friends_incoming_heading),
                            modifier = Modifier.padding(horizontal = 20.dp, vertical = 6.dp),
                        )
                    }
                    val incoming = data?.incoming.orEmpty()
                    if (data != null && incoming.isEmpty()) {
                        item {
                            NoteText(stringResource(R.string.friends_incoming_empty))
                        }
                    }
                    items(incoming, key = { "in-${it.user.id}" }) { request ->
                        IncomingRequestCard(
                            request = request,
                            busy = busy,
                            onAccept = {
                                vm.acceptFriend(request.user.username, request.user.displayName)
                            },
                            onDecline = { vm.declineFriend(request.user.username) },
                        )
                    }

                    item {
                        SectionLabel(
                            stringResource(R.string.friends_outgoing_heading),
                            modifier = Modifier.padding(horizontal = 20.dp, vertical = 6.dp),
                        )
                    }
                    val outgoing = data?.outgoing.orEmpty()
                    if (data != null && outgoing.isEmpty()) {
                        item {
                            NoteText(stringResource(R.string.friends_outgoing_empty))
                        }
                    }
                    items(outgoing, key = { "out-${it.user.id}" }) { request ->
                        OutgoingRequestCard(
                            request = request,
                            busy = busy,
                            onCancel = { vm.cancelFriendRequest(request.user.username) },
                        )
                    }
                }

                TAB_SUGGESTIONS -> {
                    item {
                        SectionLabel(
                            stringResource(R.string.friends_suggestions_title),
                            modifier = Modifier.padding(horizontal = 20.dp, vertical = 6.dp),
                        )
                    }
                    val suggestions = data?.suggestions.orEmpty()
                    if (data != null && suggestions.isEmpty()) {
                        item {
                            Surface(
                                color = Ivory,
                                shape = RoundedCornerShape(16.dp),
                                border = BorderStroke(1.dp, Line),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(horizontal = 20.dp),
                            ) {
                                EmptyState(
                                    title = stringResource(R.string.friends_suggestions_empty_title),
                                    body = stringResource(R.string.friends_suggestions_empty_body),
                                )
                            }
                        }
                    }
                    items(suggestions, key = { it.id }) { user ->
                        SuggestionCard(
                            user = user,
                            busy = busy,
                            onRequest = { vm.requestFriend(user.username, user.displayName) },
                            onAccept = { vm.acceptFriend(user.username, user.displayName) },
                        )
                    }
                }

                TAB_ASSETS -> {
                    item {
                        Column(Modifier.padding(horizontal = 20.dp)) {
                            OutlinedTextField(
                                value = query,
                                onValueChange = { query = it.take(80) },
                                singleLine = true,
                                placeholder = {
                                    Text(stringResource(R.string.friends_assets_search))
                                },
                                leadingIcon = {
                                    Icon(
                                        Icons.Outlined.Search,
                                        contentDescription = null,
                                        tint = Muted,
                                        modifier = Modifier.size(19.dp),
                                    )
                                },
                                trailingIcon = {
                                    if (query.isNotEmpty()) {
                                        IconButton(onClick = {
                                            query = ""
                                            search()
                                        }) {
                                            Icon(
                                                Icons.Outlined.Close,
                                                contentDescription = stringResource(
                                                    R.string.assets_search_clear,
                                                ),
                                                tint = Muted,
                                                modifier = Modifier.size(18.dp),
                                            )
                                        }
                                    }
                                },
                                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
                                keyboardActions = KeyboardActions(onSearch = { search() }),
                                modifier = Modifier.fillMaxWidth(),
                            )
                            Spacer(Modifier.height(10.dp))
                            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                listOf(
                                    "" to R.string.friends_assets_filter_all,
                                    "friends" to R.string.friends_assets_filter_friends,
                                    "public" to R.string.visibility_public,
                                    "granted" to R.string.friends_assets_filter_granted,
                                ).forEach { (value, label) ->
                                    Pill(
                                        text = stringResource(label),
                                        selected = relation == value,
                                        onClick = { relation = value },
                                    )
                                }
                            }
                            Spacer(Modifier.height(6.dp))
                        }
                    }

                    val shared = data?.shared.orEmpty()
                        .filter { relation.isEmpty() || it.relation == relation }
                    if (data != null && shared.isEmpty()) {
                        item {
                            Surface(
                                color = Ivory,
                                shape = RoundedCornerShape(16.dp),
                                border = BorderStroke(1.dp, Line),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(horizontal = 20.dp, vertical = 8.dp),
                            ) {
                                EmptyState(
                                    title = stringResource(R.string.friends_assets_empty_title),
                                    body = stringResource(R.string.friends_assets_empty_body),
                                )
                            }
                        }
                    }
                    items(shared, key = { it.id }) { asset ->
                        SharedAssetRow(asset = asset, onClick = { onOpenAsset(asset.id) })
                    }

                    item {
                        Text(
                            stringResource(R.string.friends_assets_note),
                            style = MaterialTheme.typography.bodySmall,
                            color = Muted,
                            modifier = Modifier.padding(horizontal = 20.dp, vertical = 14.dp),
                        )
                    }
                }
            }
        }
    }

    val target = removeTarget
    if (target != null) {
        AlertDialog(
            onDismissRequest = { removeTarget = null },
            title = { Text(stringResource(R.string.friends_remove_title)) },
            text = {
                Text(stringResource(R.string.friends_remove_body, target.displayName))
            },
            confirmButton = {
                TextButton(onClick = {
                    removeTarget = null
                    vm.removeFriend(target.username, target.displayName)
                }) {
                    Text(stringResource(R.string.friends_remove), color = Danger)
                }
            },
            dismissButton = {
                TextButton(onClick = { removeTarget = null }) {
                    Text(stringResource(R.string.friends_cancel), color = Forest)
                }
            },
        )
    }
}

@Composable
private fun tabLabel(@androidx.annotation.StringRes label: Int, count: Int?): String {
    val text = stringResource(label)
    return if (count != null && count > 0) "$text · $count" else text
}

@Composable
private fun HeroStat(value: String, label: String, modifier: Modifier = Modifier) {
    Column(
        modifier = modifier
            .background(Paper.copy(alpha = 0.08f), RoundedCornerShape(10.dp))
            .padding(horizontal = 10.dp, vertical = 9.dp),
    ) {
        Text(value, style = MaterialTheme.typography.headlineSmall, color = Paper)
        Text(
            label.uppercase(),
            style = MaterialTheme.typography.labelSmall,
            color = Sage,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
    }
}

@Composable
private fun NoteText(text: String) {
    Text(
        text,
        style = MaterialTheme.typography.bodySmall,
        color = Muted,
        modifier = Modifier.padding(horizontal = 20.dp, vertical = 6.dp),
    )
}

@Composable
private fun FriendCard(friend: Friend, busy: Boolean, onRemove: () -> Unit) {
    Surface(
        color = Ivory,
        shape = RoundedCornerShape(14.dp),
        border = BorderStroke(1.dp, Line),
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 20.dp, vertical = 4.dp),
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Avatar(friend.displayName, friend.avatarUrl, size = 42.dp)
            Spacer(Modifier.width(10.dp))
            Column(Modifier.weight(1f)) {
                Text(
                    friend.displayName,
                    style = MaterialTheme.typography.titleMedium,
                    color = Forest,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                Text(
                    "@${friend.username}",
                    style = MaterialTheme.typography.bodySmall,
                    color = Muted,
                )
                if (!friend.since.isNullOrBlank()) {
                    Text(
                        stringResource(R.string.friends_since, formatDate(friend.since)),
                        style = MaterialTheme.typography.labelSmall,
                        color = SageInk,
                    )
                }
            }
            TextButton(onClick = onRemove, enabled = !busy) {
                Text(stringResource(R.string.friends_remove), color = Danger)
            }
        }
    }
}

@Composable
private fun IncomingRequestCard(
    request: FriendRequest,
    busy: Boolean,
    onAccept: () -> Unit,
    onDecline: () -> Unit,
) {
    Surface(
        color = Ivory,
        shape = RoundedCornerShape(14.dp),
        border = BorderStroke(1.dp, Line),
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 20.dp, vertical = 4.dp),
    ) {
        Column(Modifier.padding(12.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Avatar(request.user.displayName, request.user.avatarUrl, size = 42.dp)
                Spacer(Modifier.width(10.dp))
                Column(Modifier.weight(1f)) {
                    Text(
                        request.user.displayName,
                        style = MaterialTheme.typography.titleMedium,
                        color = Forest,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                    Text(
                        "@${request.user.username}",
                        style = MaterialTheme.typography.bodySmall,
                        color = Muted,
                    )
                }
            }
            Spacer(Modifier.height(10.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Surface(
                    color = Forest,
                    shape = RoundedCornerShape(50),
                    modifier = Modifier
                        .weight(1f)
                        .clickable(enabled = !busy) { onAccept() },
                ) {
                    Text(
                        stringResource(R.string.friends_accept),
                        style = MaterialTheme.typography.labelLarge,
                        color = Paper,
                        modifier = Modifier.padding(vertical = 8.dp),
                        textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                    )
                }
                Surface(
                    color = Color.Transparent,
                    shape = RoundedCornerShape(50),
                    border = BorderStroke(1.dp, Line),
                    modifier = Modifier
                        .weight(1f)
                        .clickable(enabled = !busy) { onDecline() },
                ) {
                    Text(
                        stringResource(R.string.friends_decline),
                        style = MaterialTheme.typography.labelLarge,
                        color = Forest,
                        modifier = Modifier.padding(vertical = 8.dp),
                        textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                    )
                }
            }
        }
    }
}

@Composable
private fun OutgoingRequestCard(request: FriendRequest, busy: Boolean, onCancel: () -> Unit) {
    Surface(
        color = Ivory,
        shape = RoundedCornerShape(14.dp),
        border = BorderStroke(1.dp, Line),
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 20.dp, vertical = 4.dp),
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Avatar(request.user.displayName, request.user.avatarUrl, size = 42.dp)
            Spacer(Modifier.width(10.dp))
            Column(Modifier.weight(1f)) {
                Text(
                    request.user.displayName,
                    style = MaterialTheme.typography.titleMedium,
                    color = Forest,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                Text(
                    "@${request.user.username}",
                    style = MaterialTheme.typography.bodySmall,
                    color = Muted,
                )
            }
            Surface(color = PaperDeep, shape = RoundedCornerShape(50)) {
                Text(
                    stringResource(R.string.friends_pending),
                    style = MaterialTheme.typography.labelSmall,
                    color = Muted,
                    modifier = Modifier.padding(horizontal = 9.dp, vertical = 5.dp),
                )
            }
            TextButton(onClick = onCancel, enabled = !busy) {
                Text(stringResource(R.string.friends_cancel_request), color = Danger)
            }
        }
    }
}

@Composable
private fun SuggestionCard(
    user: User,
    busy: Boolean,
    onRequest: () -> Unit,
    onAccept: () -> Unit,
) {
    Surface(
        color = Ivory,
        shape = RoundedCornerShape(14.dp),
        border = BorderStroke(1.dp, Line),
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 20.dp, vertical = 4.dp),
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Avatar(user.displayName, user.avatarUrl, size = 42.dp)
            Spacer(Modifier.width(10.dp))
            Column(Modifier.weight(1f)) {
                Text(
                    user.displayName,
                    style = MaterialTheme.typography.titleMedium,
                    color = Forest,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                Text(
                    "@${user.username}",
                    style = MaterialTheme.typography.bodySmall,
                    color = Muted,
                )
                if (!user.bio.isNullOrBlank()) {
                    Text(
                        user.bio ?: "",
                        style = MaterialTheme.typography.bodySmall,
                        color = Muted,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
            }
            SuggestionAction(
                status = user.friendStatus,
                enabled = !busy,
                onRequest = onRequest,
                onAccept = onAccept,
            )
        }
    }
}

@Composable
private fun SuggestionAction(
    status: String?,
    enabled: Boolean,
    onRequest: () -> Unit,
    onAccept: () -> Unit,
) {
    val label: Int
    val onClick: (() -> Unit)?
    when (status) {
        "friends" -> {
            label = R.string.friends_are
            onClick = null
        }
        "pending_out" -> {
            label = R.string.friends_request_sent
            onClick = null
        }
        "pending_in" -> {
            label = R.string.friends_accept_request
            onClick = onAccept
        }
        else -> {
            label = R.string.friends_add
            onClick = onRequest
        }
    }
    Surface(
        color = if (onClick == null) PaperDeep else Forest,
        shape = RoundedCornerShape(50),
        modifier = Modifier.then(
            if (onClick != null) Modifier.clickable(enabled = enabled) { onClick() } else Modifier,
        ),
    ) {
        Text(
            stringResource(label),
            style = MaterialTheme.typography.labelSmall,
            color = if (onClick == null) Muted else Paper,
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
            maxLines = 1,
        )
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
            .padding(horizontal = 20.dp, vertical = 4.dp)
            .clickable { onClick() },
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(
                modifier = Modifier
                    .size(width = 76.dp, height = 76.dp)
                    .background(SageLight),
                contentAlignment = Alignment.Center,
            ) {
                val cover = MediaUrl.resolve(asset.coverUrl)
                if (cover != null) {
                    AsyncImage(
                        model = cover,
                        contentDescription = asset.title,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier.size(width = 76.dp, height = 76.dp),
                    )
                } else {
                    Text(
                        asset.type?.label?.take(1)?.uppercase() ?: "V",
                        style = MaterialTheme.typography.titleLarge,
                        color = SageInk,
                    )
                }
            }
            Column(
                modifier = Modifier
                    .weight(1f)
                    .padding(horizontal = 12.dp, vertical = 8.dp),
            ) {
                Text(
                    asset.type?.label ?: stringResource(R.string.common_asset),
                    style = MaterialTheme.typography.labelSmall,
                    color = Clay,
                )
                Text(
                    asset.title,
                    style = MaterialTheme.typography.titleMedium,
                    color = Forest,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        stringResource(
                            R.string.friends_shared_by,
                            "@${asset.owner?.username.orEmpty()}",
                        ),
                        style = MaterialTheme.typography.bodySmall,
                        color = Muted,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
                Spacer(Modifier.height(4.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    VisibilityTag(asset.visibility)
                    if (asset.relation != "public") {
                        Spacer(Modifier.width(6.dp))
                        Text(
                            stringResource(
                                if (asset.relation == "friends") {
                                    R.string.friends_relation_friends
                                } else {
                                    R.string.friends_relation_granted
                                },
                            ),
                            style = MaterialTheme.typography.labelSmall,
                            color = SageInk,
                        )
                    }
                }
            }
            Icon(
                Icons.Outlined.ChevronRight,
                contentDescription = null,
                tint = Muted,
                modifier = Modifier
                    .padding(end = 12.dp)
                    .size(18.dp),
            )
        }
    }
}
