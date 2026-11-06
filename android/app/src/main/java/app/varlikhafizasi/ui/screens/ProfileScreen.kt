package app.varlikhafizasi.ui.screens

import android.app.Activity
import android.content.Context
import android.content.ContextWrapper
import android.content.Intent
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
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
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.Logout
import androidx.compose.material.icons.outlined.ChevronRight
import androidx.compose.material.icons.outlined.Groups
import androidx.compose.material.icons.outlined.Language
import androidx.compose.material.icons.outlined.PhotoCamera
import androidx.compose.material.icons.outlined.Share
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import app.varlikhafizasi.R
import app.varlikhafizasi.data.AppLanguage
import app.varlikhafizasi.data.Asset
import app.varlikhafizasi.data.FeedPost
import app.varlikhafizasi.data.SocialConnection
import app.varlikhafizasi.data.SocialConnectionsPayload
import app.varlikhafizasi.data.User
import app.varlikhafizasi.ui.Loadable
import app.varlikhafizasi.ui.VhViewModel
import app.varlikhafizasi.ui.components.AssetRow
import app.varlikhafizasi.ui.components.Avatar
import app.varlikhafizasi.ui.components.EmptyState
import app.varlikhafizasi.ui.components.ErrorBox
import app.varlikhafizasi.ui.components.GoldRule
import app.varlikhafizasi.ui.components.LoadingBox
import app.varlikhafizasi.ui.components.NotificationBell
import app.varlikhafizasi.ui.components.SectionLabel
import app.varlikhafizasi.ui.components.VhTopBar
import app.varlikhafizasi.ui.components.formatDate
import app.varlikhafizasi.ui.theme.Clay
import app.varlikhafizasi.ui.theme.Danger
import app.varlikhafizasi.ui.theme.Forest
import app.varlikhafizasi.ui.theme.Line
import app.varlikhafizasi.ui.theme.Muted
import app.varlikhafizasi.ui.theme.Paper
import app.varlikhafizasi.ui.theme.PaperDeep
import app.varlikhafizasi.ui.theme.Sage
import app.varlikhafizasi.ui.theme.SageInk
import app.varlikhafizasi.ui.theme.Ivory

@Composable
fun ProfileScreen(
    vm: VhViewModel,
    viewer: User,
    onOpenAsset: (String) -> Unit,
    onOpenNotifications: () -> Unit,
    onOpenFriends: () -> Unit,
) {
    val state by vm.profile.collectAsStateWithLifecycle()
    val notifications by vm.notifications.collectAsStateWithLifecycle()
    val socialState by vm.social.collectAsStateWithLifecycle()
    val socialBusy by vm.socialBusy.collectAsStateWithLifecycle()
    val socialError by vm.socialError.collectAsStateWithLifecycle()
    val avatarBusy by vm.avatarBusy.collectAsStateWithLifecycle()
    val unreadCount = notifications.data?.unreadCount ?: 0
    var confirmLogout by rememberSaveable { mutableStateOf(false) }
    var showLanguage by rememberSaveable { mutableStateOf(false) }
    var showPhotoMenu by rememberSaveable { mutableStateOf(false) }
    var pendingAvatarUri by remember { mutableStateOf<Uri?>(null) }
    var shareAsset by remember { mutableStateOf<Asset?>(null) }
    val context = LocalContext.current
    val browserUnavailable = stringResource(R.string.error_browser_unavailable)
    val cameraUnavailable = stringResource(R.string.media_camera_unavailable)
    val currentLanguage = AppLanguage.currentTag(context)
    val currentLanguageName =
        AppLanguage.nativeNames[currentLanguage] ?: AppLanguage.nativeNames["tr"].orEmpty()

    val avatarPicker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        if (uri != null) vm.updateAvatar(uri)
    }
    val avatarCamera =
        rememberLauncherForActivityResult(ActivityResultContracts.TakePicture()) { saved ->
            val captured = pendingAvatarUri
            pendingAvatarUri = null
            if (saved && captured != null) vm.updateAvatar(captured)
        }

    fun captureAvatar() {
        val target = runCatching { createCaptureUri(context, "avatar") }.getOrElse {
            vm.setNotice(cameraUnavailable)
            return
        }
        pendingAvatarUri = target
        runCatching { avatarCamera.launch(target) }.onFailure {
            pendingAvatarUri = null
            vm.setNotice(cameraUnavailable)
        }
    }

    LaunchedEffect(viewer.id) {
        vm.loadProfile()
        vm.loadSocial()
    }

    // Tarayıcıdan dönünce bağlantı durumu tazelenir.
    val lifecycleOwner = LocalLifecycleOwner.current
    val resumedOnce = remember { mutableStateOf(false) }
    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_RESUME) {
                if (resumedOnce.value) {
                    vm.loadSocial(showSpinner = false)
                } else {
                    resumedOnce.value = true
                }
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose { lifecycleOwner.lifecycle.removeObserver(observer) }
    }

    val profileState = state.data
    val payload = profileState?.payload
    val user = payload?.user ?: viewer
    val stats = user.stats

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Paper),
    ) {
        VhTopBar(
            title = stringResource(R.string.nav_profile),
            actions = {
                NotificationBell(unreadCount = unreadCount, onClick = onOpenNotifications)
                IconButton(onClick = { confirmLogout = true }) {
                    Icon(
                        Icons.AutoMirrored.Outlined.Logout,
                        contentDescription = stringResource(R.string.profile_logout),
                        tint = Forest,
                    )
                }
            },
        )

        LazyColumn(
            contentPadding = PaddingValues(horizontal = 20.dp, vertical = 6.dp),
            modifier = Modifier.fillMaxSize(),
        ) {
            item {
                Surface(
                    color = Forest,
                    shape = RoundedCornerShape(22.dp),
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Column(Modifier.padding(20.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(
                                modifier = Modifier
                                    .size(58.dp)
                                    .clickable(
                                        enabled = !avatarBusy,
                                        onClickLabel = stringResource(R.string.profile_photo_change),
                                    ) { showPhotoMenu = true },
                                contentAlignment = Alignment.Center,
                            ) {
                                Avatar(user.displayName, user.avatarUrl, size = 58.dp)
                                Box(
                                    modifier = Modifier
                                        .align(Alignment.BottomEnd)
                                        .size(20.dp)
                                        .background(Clay, CircleShape),
                                    contentAlignment = Alignment.Center,
                                ) {
                                    if (avatarBusy) {
                                        CircularProgressIndicator(
                                            color = Paper,
                                            strokeWidth = 2.dp,
                                            modifier = Modifier.size(11.dp),
                                        )
                                    } else {
                                        Icon(
                                            Icons.Outlined.PhotoCamera,
                                            contentDescription = null,
                                            tint = Paper,
                                            modifier = Modifier.size(12.dp),
                                        )
                                    }
                                }
                            }
                            Spacer(Modifier.width(14.dp))
                            Column(Modifier.weight(1f)) {
                                Text(
                                    user.displayName,
                                    style = MaterialTheme.typography.headlineSmall,
                                    color = Paper,
                                )
                                Text(
                                    "@${user.username}",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = Sage,
                                )
                            }
                        }
                        if (!user.bio.isNullOrBlank()) {
                            Spacer(Modifier.height(12.dp))
                            Text(
                                user.bio ?: "",
                                style = MaterialTheme.typography.bodyMedium,
                                color = Paper.copy(alpha = 0.82f),
                            )
                        }
                        Spacer(Modifier.height(14.dp))
                        GoldRule()
                        Spacer(Modifier.height(14.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            ProfileStat(
                                "${stats?.assets ?: 0}",
                                stringResource(R.string.profile_stat_assets),
                                Modifier.weight(1f),
                            )
                            ProfileStat(
                                "${stats?.entries ?: 0}",
                                stringResource(R.string.profile_stat_entries),
                                Modifier.weight(1f),
                            )
                            ProfileStat(
                                "${stats?.followers ?: 0}",
                                stringResource(R.string.profile_stat_followers),
                                Modifier.weight(1f),
                            )
                            ProfileStat(
                                "${stats?.following ?: 0}",
                                stringResource(R.string.profile_stat_following),
                                Modifier.weight(1f),
                            )
                        }
                        if (!user.email.isNullOrBlank() || !user.interests.isNullOrEmpty()) {
                            Spacer(Modifier.height(12.dp))
                            if (!user.email.isNullOrBlank()) {
                                Text(
                                    user.email ?: "",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = Paper.copy(alpha = 0.55f),
                                )
                            }
                            if (!user.interests.isNullOrEmpty()) {
                                Text(
                                    user.interests.joinToString(" · "),
                                    style = MaterialTheme.typography.bodySmall,
                                    color = Paper.copy(alpha = 0.55f),
                                )
                            }
                        }
                    }
                }
            }

            item {
                Spacer(Modifier.height(14.dp))
                ProfileSocialCard(
                    state = socialState,
                    busy = socialBusy,
                    error = socialError,
                    onRetry = { vm.loadSocial() },
                    onConnect = {
                        vm.startSocial { url ->
                            runCatching {
                                context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
                            }.onFailure { vm.setNotice(browserUnavailable) }
                        }
                    },
                    onDisconnect = { vm.disconnectSocial(it) },
                )
            }

            item {
                Spacer(Modifier.height(12.dp))
                Surface(
                    color = Ivory,
                    shape = RoundedCornerShape(14.dp),
                    border = BorderStroke(1.dp, Line),
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { onOpenFriends() },
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 14.dp, vertical = 12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Icon(
                            Icons.Outlined.Groups,
                            contentDescription = null,
                            tint = SageInk,
                            modifier = Modifier.width(22.dp),
                        )
                        Spacer(Modifier.width(10.dp))
                        Column(Modifier.weight(1f)) {
                            Text(
                                stringResource(R.string.friends_title),
                                style = MaterialTheme.typography.titleSmall,
                                color = Forest,
                            )
                            Text(
                                pluralStringResource(
                                    R.plurals.friends_count,
                                    stats?.friends ?: 0,
                                    stats?.friends ?: 0,
                                ),
                                style = MaterialTheme.typography.bodySmall,
                                color = Muted,
                            )
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

            if (state.loading && payload == null) item { LoadingBox() }
            if (state.error != null) {
                item {
                    Box(Modifier.padding(top = 12.dp)) {
                        ErrorBox(state.error ?: "", onRetry = { vm.loadProfile() })
                    }
                }
            }

            item {
                Spacer(Modifier.height(16.dp))
                SectionLabel(stringResource(R.string.profile_assets_title))
            }
            val assets = payload?.assets.orEmpty()
            if (payload != null && assets.isEmpty()) {
                item {
                    Surface(
                        color = Ivory,
                        shape = RoundedCornerShape(16.dp),
                        border = BorderStroke(1.dp, Line),
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        EmptyState(
                            title = stringResource(R.string.profile_empty_title),
                            body = stringResource(R.string.profile_empty_body),
                        )
                    }
                }
            }
            items(assets, key = { it.id }) { asset ->
                AssetRow(
                    asset = asset,
                    onClick = { onOpenAsset(asset.id) },
                    modifier = Modifier.padding(vertical = 3.dp),
                    action = if (socialState.data?.items?.isNotEmpty() == true) {
                        {
                            IconButton(onClick = { shareAsset = asset }) {
                                Icon(
                                    Icons.Outlined.Share,
                                    contentDescription = stringResource(
                                        R.string.profile_social_share_title,
                                    ),
                                    tint = SageInk,
                                    modifier = Modifier.size(20.dp),
                                )
                            }
                        }
                    } else {
                        null
                    },
                )
            }

            val posts = profileState?.posts.orEmpty()
            if (posts.isNotEmpty()) {
                item {
                    Spacer(Modifier.height(14.dp))
                    SectionLabel(stringResource(R.string.profile_posts_title))
                }
                items(posts, key = { it.id }) { post ->
                    ProfilePost(post)
                }
            }

            item {
                Spacer(Modifier.height(16.dp))
                SectionLabel(stringResource(R.string.language_section))
                Surface(
                    color = Ivory,
                    shape = RoundedCornerShape(14.dp),
                    border = BorderStroke(1.dp, Line),
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { showLanguage = true },
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 14.dp, vertical = 12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Icon(
                            Icons.Outlined.Language,
                            contentDescription = null,
                            tint = SageInk,
                            modifier = Modifier.width(22.dp),
                        )
                        Spacer(Modifier.width(10.dp))
                        Column(Modifier.weight(1f)) {
                            Text(
                                stringResource(R.string.language_title),
                                style = MaterialTheme.typography.titleSmall,
                                color = Forest,
                            )
                            Text(
                                stringResource(R.string.language_current, currentLanguageName),
                                style = MaterialTheme.typography.bodySmall,
                                color = Muted,
                            )
                        }
                    }
                }
            }

            item {
                Spacer(Modifier.height(18.dp))
                Surface(
                    color = PaperDeep,
                    shape = RoundedCornerShape(14.dp),
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Column(Modifier.padding(14.dp)) {
                        Text(
                            stringResource(R.string.profile_data_title),
                            style = MaterialTheme.typography.titleSmall,
                            color = Forest,
                        )
                        Text(
                            stringResource(R.string.profile_data_body),
                            style = MaterialTheme.typography.bodySmall,
                            color = Muted,
                        )
                    }
                }
                Spacer(Modifier.height(22.dp))
                Text(
                    stringResource(R.string.profile_version),
                    style = MaterialTheme.typography.labelSmall,
                    color = Muted,
                )
                Spacer(Modifier.height(20.dp))
            }
        }
    }

    if (showPhotoMenu) {
        AlertDialog(
            onDismissRequest = { showPhotoMenu = false },
            title = { Text(stringResource(R.string.profile_photo_change)) },
            text = {
                Column {
                    TextButton(onClick = {
                        showPhotoMenu = false
                        avatarPicker.launch("image/*")
                    }) {
                        Text(stringResource(R.string.media_pick_gallery), color = Forest)
                    }
                    TextButton(onClick = {
                        showPhotoMenu = false
                        captureAvatar()
                    }) {
                        Text(stringResource(R.string.media_take_photo), color = Forest)
                    }
                    if (user.avatarUrl != null) {
                        TextButton(onClick = {
                            showPhotoMenu = false
                            vm.updateAvatar(null)
                        }) {
                            Text(stringResource(R.string.profile_photo_remove), color = Danger)
                        }
                    }
                }
            },
            confirmButton = {
                TextButton(onClick = { showPhotoMenu = false }) {
                    Text(stringResource(R.string.profile_logout_cancel), color = Forest)
                }
            },
        )
    }

    val shareData = socialState.data
    val shareTarget = shareAsset
    if (shareTarget != null && shareData != null && shareData.items.isNotEmpty()) {
        SocialShareDialog(
            vm = vm,
            asset = shareTarget,
            payload = shareData,
            onClose = { shareAsset = null },
        )
    }

    if (confirmLogout) {
        AlertDialog(
            onDismissRequest = { confirmLogout = false },
            title = { Text(stringResource(R.string.profile_logout_title)) },
            text = { Text(stringResource(R.string.profile_logout_body)) },
            confirmButton = {
                TextButton(onClick = {
                    confirmLogout = false
                    vm.logout()
                }) { Text(stringResource(R.string.profile_logout_confirm), color = Danger) }
            },
            dismissButton = {
                TextButton(onClick = { confirmLogout = false }) {
                    Text(stringResource(R.string.profile_logout_cancel), color = Forest)
                }
            },
        )
    }

    if (showLanguage) {
        AlertDialog(
            onDismissRequest = { showLanguage = false },
            title = { Text(stringResource(R.string.language_dialog_title)) },
            text = {
                Column {
                    Text(
                        stringResource(R.string.language_dialog_body),
                        style = MaterialTheme.typography.bodySmall,
                        color = Muted,
                    )
                    Spacer(Modifier.height(6.dp))
                    AppLanguage.supportedTags.forEach { tag ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable {
                                    showLanguage = false
                                    if (tag != currentLanguage) {
                                        AppLanguage.set(context, tag)
                                        context.findActivity()?.recreate()
                                    }
                                }
                                .padding(vertical = 8.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            RadioButton(selected = tag == currentLanguage, onClick = null)
                            Spacer(Modifier.width(8.dp))
                            Text(
                                AppLanguage.nativeNames[tag].orEmpty(),
                                style = MaterialTheme.typography.bodyMedium,
                                color = Forest,
                            )
                        }
                    }
                }
            },
            confirmButton = {
                TextButton(onClick = { showLanguage = false }) {
                    Text(stringResource(R.string.language_cancel), color = Forest)
                }
            },
        )
    }
}

@Composable
private fun ProfileSocialCard(
    state: Loadable<SocialConnectionsPayload>,
    busy: Boolean,
    error: String?,
    onRetry: () -> Unit,
    onConnect: () -> Unit,
    onDisconnect: (String) -> Unit,
) {
    val payload = state.data
    val config = payload?.config
    val connections = payload?.items.orEmpty()

    Surface(
        color = Ivory,
        shape = RoundedCornerShape(18.dp),
        border = BorderStroke(1.dp, Line),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    Icons.Outlined.Share,
                    contentDescription = null,
                    tint = SageInk,
                    modifier = Modifier.size(20.dp),
                )
                Spacer(Modifier.width(9.dp))
                Column(Modifier.weight(1f)) {
                    Text(
                        stringResource(R.string.profile_social_title),
                        style = MaterialTheme.typography.titleMedium,
                        color = Forest,
                    )
                    Text(
                        stringResource(R.string.profile_social_subtitle),
                        style = MaterialTheme.typography.bodySmall,
                        color = Muted,
                    )
                }
            }

            when {
                payload == null && state.loading -> {
                    Spacer(Modifier.height(10.dp))
                    LoadingBox()
                }

                payload == null && state.error != null -> {
                    Spacer(Modifier.height(10.dp))
                    ErrorBox(state.error, onRetry = onRetry)
                }

                payload != null -> {
                    Spacer(Modifier.height(12.dp))
                    if (config?.configured == true) {
                        SocialAccountRow(
                            provider = "facebook",
                            label = "Facebook",
                            connection = connections.firstOrNull { it.provider == "facebook" },
                            busy = busy,
                            onDisconnect = onDisconnect,
                        )
                        SocialAccountRow(
                            provider = "instagram",
                            label = "Instagram",
                            connection = connections.firstOrNull { it.provider == "instagram" },
                            busy = busy,
                            onDisconnect = onDisconnect,
                        )
                        Spacer(Modifier.height(10.dp))
                        Button(onClick = onConnect, enabled = !busy) {
                            Text(
                                stringResource(
                                    if (connections.isEmpty()) {
                                        R.string.profile_social_connect
                                    } else {
                                        R.string.profile_social_add
                                    },
                                ),
                            )
                        }
                        if (connections.isNotEmpty()) {
                            Spacer(Modifier.height(6.dp))
                            Text(
                                stringResource(R.string.profile_social_share_hint),
                                style = MaterialTheme.typography.bodySmall,
                                color = Muted,
                            )
                        }
                    } else {
                        Text(
                            stringResource(R.string.profile_social_not_configured),
                            style = MaterialTheme.typography.bodySmall,
                            color = Muted,
                        )
                        Spacer(Modifier.height(10.dp))
                        Button(onClick = onConnect, enabled = false) {
                            Text(stringResource(R.string.profile_social_connect))
                        }
                    }
                    if (error != null) {
                        Spacer(Modifier.height(8.dp))
                        Text(
                            error,
                            style = MaterialTheme.typography.bodySmall,
                            color = Danger,
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun SocialAccountRow(
    provider: String,
    label: String,
    connection: SocialConnection?,
    busy: Boolean,
    onDisconnect: (String) -> Unit,
) {
    val isFacebook = provider == "facebook"
    val tint = if (isFacebook) Color(0xFF1877F2) else Color(0xFFC43A7A)

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            modifier = Modifier
                .size(34.dp)
                .background(tint.copy(alpha = 0.12f), RoundedCornerShape(10.dp)),
            contentAlignment = Alignment.Center,
        ) {
            Text(
                if (isFacebook) "f" else "ig",
                style = MaterialTheme.typography.titleMedium,
                color = tint,
            )
        }
        Spacer(Modifier.width(10.dp))
        Column(Modifier.weight(1f)) {
            Text(label, style = MaterialTheme.typography.titleSmall, color = Forest)
            Text(
                connection?.accountName
                    ?: stringResource(R.string.profile_social_not_connected),
                style = MaterialTheme.typography.bodySmall,
                color = if (connection != null) Forest else Muted,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            if (connection != null && !connection.accountUsername.isNullOrBlank()) {
                Text(
                    "@${connection.accountUsername}",
                    style = MaterialTheme.typography.labelSmall,
                    color = Muted,
                )
            }
        }
        if (connection != null) {
            TextButton(onClick = { onDisconnect(connection.id) }, enabled = !busy) {
                Text(stringResource(R.string.profile_social_disconnect), color = Danger)
            }
        }
    }
}

@Composable
private fun SocialShareDialog(
    vm: VhViewModel,
    asset: Asset,
    payload: SocialConnectionsPayload,
    onClose: () -> Unit,
) {
    val busy by vm.socialBusy.collectAsStateWithLifecycle()
    val error by vm.socialError.collectAsStateWithLifecycle()
    val errorMessage = error
    val connections = payload.items
    val config = payload.config
    var provider by rememberSaveable(asset.id) {
        mutableStateOf(connections.firstOrNull()?.provider ?: "facebook")
    }
    var format by rememberSaveable(asset.id) { mutableStateOf("post") }
    var caption by rememberSaveable(asset.id) { mutableStateOf("") }

    LaunchedEffect(Unit) { vm.clearSocialError() }

    val instagramBlocked = provider == "instagram" && !config.instagramReady
    val providerReady = connections.any { it.provider == provider }

    AlertDialog(
        onDismissRequest = { if (!busy) onClose() },
        title = { Text(stringResource(R.string.profile_social_share_title)) },
        text = {
            Column(
                modifier = Modifier
                    .heightIn(max = 420.dp)
                    .verticalScroll(rememberScrollState()),
            ) {
                Text(
                    asset.title,
                    style = MaterialTheme.typography.titleSmall,
                    color = Forest,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )
                Spacer(Modifier.height(12.dp))
                Text(
                    stringResource(R.string.profile_social_provider),
                    style = MaterialTheme.typography.labelSmall,
                    color = Muted,
                )
                Spacer(Modifier.height(4.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    FilterChip(
                        selected = provider == "facebook",
                        onClick = { provider = "facebook" },
                        enabled = connections.any { it.provider == "facebook" },
                        label = { Text("Facebook") },
                    )
                    FilterChip(
                        selected = provider == "instagram",
                        onClick = { provider = "instagram" },
                        enabled = connections.any { it.provider == "instagram" },
                        label = { Text("Instagram") },
                    )
                }
                Spacer(Modifier.height(10.dp))
                Text(
                    stringResource(R.string.profile_social_format),
                    style = MaterialTheme.typography.labelSmall,
                    color = Muted,
                )
                Spacer(Modifier.height(4.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    listOf(
                        "post" to R.string.profile_social_format_post,
                        "story" to R.string.profile_social_format_story,
                        "reel" to R.string.profile_social_format_reel,
                    ).forEach { (value, labelId) ->
                        FilterChip(
                            selected = format == value,
                            onClick = { format = value },
                            label = { Text(stringResource(labelId)) },
                        )
                    }
                }
                if (format != "story") {
                    Spacer(Modifier.height(10.dp))
                    OutlinedTextField(
                        value = caption,
                        onValueChange = { if (it.length <= 2200) caption = it },
                        modifier = Modifier.fillMaxWidth(),
                        label = { Text(stringResource(R.string.profile_social_caption)) },
                        minLines = 2,
                        maxLines = 4,
                    )
                }
                if (instagramBlocked) {
                    Spacer(Modifier.height(8.dp))
                    Text(
                        stringResource(R.string.profile_social_instagram_blocked),
                        style = MaterialTheme.typography.bodySmall,
                        color = Clay,
                    )
                }
                if (errorMessage != null) {
                    Spacer(Modifier.height(8.dp))
                    Text(
                        errorMessage,
                        style = MaterialTheme.typography.bodySmall,
                        color = Danger,
                    )
                }
            }
        },
        confirmButton = {
            TextButton(
                onClick = {
                    vm.shareSocial(
                        assetId = asset.id,
                        provider = provider,
                        format = format,
                        caption = caption.trim().ifBlank { null },
                        onShared = onClose,
                    )
                },
                enabled = !busy && providerReady && !instagramBlocked,
            ) {
                Text(
                    stringResource(
                        if (busy) {
                            R.string.profile_social_share_busy
                        } else {
                            R.string.profile_social_share_action
                        },
                    ),
                )
            }
        },
        dismissButton = {
            TextButton(onClick = onClose, enabled = !busy) {
                Text(stringResource(R.string.profile_logout_cancel), color = Forest)
            }
        },
    )
}

private fun Context.findActivity(): Activity? {
    var current: Context = this
    while (current is ContextWrapper) {
        if (current is Activity) return current
        current = current.baseContext
    }
    return null
}

@Composable
private fun ProfileStat(value: String, label: String, modifier: Modifier = Modifier) {
    Column(
        modifier = modifier
            .background(Paper.copy(alpha = 0.07f), RoundedCornerShape(9.dp))
            .padding(horizontal = 6.dp, vertical = 8.dp),
    ) {
        Text(value, style = MaterialTheme.typography.titleLarge, color = Paper)
        Text(
            label.uppercase(),
            style = MaterialTheme.typography.labelSmall.copy(fontSize = 10.sp, letterSpacing = 0.3.sp),
            color = Sage,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
    }
}

@Composable
private fun ProfilePost(post: FeedPost) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp)
            .background(Ivory, RoundedCornerShape(12.dp))
            .padding(12.dp),
    ) {
        Text(
            post.body.ifBlank { post.asset?.title ?: stringResource(R.string.common_share) },
            style = MaterialTheme.typography.bodyMedium,
            color = Forest,
            maxLines = 3,
            overflow = TextOverflow.Ellipsis,
        )
        Row(Modifier.padding(top = 6.dp)) {
            Text(
                stringResource(R.string.common_like_count, post.likeCount),
                style = MaterialTheme.typography.labelSmall,
                color = Clay,
            )
            Spacer(Modifier.width(10.dp))
            Text(
                stringResource(R.string.common_comment_count, post.commentCount),
                style = MaterialTheme.typography.labelSmall,
                color = Muted,
            )
            Spacer(Modifier.weight(1f))
            Text(
                formatDate(post.createdAt),
                style = MaterialTheme.typography.labelSmall,
                color = Muted,
            )
        }
    }
}
