package app.varlikhafizasi.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.ChatBubbleOutline
import androidx.compose.material.icons.outlined.DoneAll
import androidx.compose.material.icons.outlined.FavoriteBorder
import androidx.compose.material.icons.outlined.Groups
import androidx.compose.material.icons.outlined.NotificationsNone
import androidx.compose.material.icons.outlined.PersonAdd
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import app.varlikhafizasi.R
import app.varlikhafizasi.data.VhNotification
import app.varlikhafizasi.ui.VhViewModel
import app.varlikhafizasi.ui.components.Avatar
import app.varlikhafizasi.ui.components.EmptyState
import app.varlikhafizasi.ui.components.ErrorBox
import app.varlikhafizasi.ui.components.LoadingBox
import app.varlikhafizasi.ui.components.VhTopBar
import app.varlikhafizasi.ui.components.formatDate
import app.varlikhafizasi.ui.theme.Clay
import app.varlikhafizasi.ui.theme.Forest
import app.varlikhafizasi.ui.theme.Gold
import app.varlikhafizasi.ui.theme.Muted
import app.varlikhafizasi.ui.theme.Paper
import app.varlikhafizasi.ui.theme.PaperDeep
import app.varlikhafizasi.ui.theme.SageLight
import app.varlikhafizasi.ui.theme.Ivory

@Composable
fun NotificationsScreen(
    vm: VhViewModel,
    onBack: () -> Unit,
    onOpenFriends: () -> Unit,
) {
    val state by vm.notifications.collectAsStateWithLifecycle()

    LaunchedEffect(Unit) { vm.loadNotifications() }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Paper),
    ) {
        VhTopBar(
            title = stringResource(R.string.common_notifications),
            subtitle = state.data?.let {
                if (it.unreadCount > 0) {
                    pluralStringResource(
                        R.plurals.archive_unread_count,
                        it.unreadCount,
                        it.unreadCount,
                    )
                } else {
                    stringResource(R.string.archive_all_read)
                }
            },
            onBack = onBack,
            actions = {
                if ((state.data?.unreadCount ?: 0) > 0) {
                    IconButton(onClick = { vm.markAllRead() }) {
                        Icon(
                            Icons.Outlined.DoneAll,
                            contentDescription = stringResource(R.string.archive_mark_all_read),
                            tint = Forest,
                        )
                    }
                }
            },
        )

        if (state.loading && state.data == null) LoadingBox()
        if (state.error != null) {
            Box(Modifier.padding(horizontal = 20.dp)) {
                ErrorBox(state.error ?: "", onRetry = { vm.loadNotifications() })
            }
        }

        val items = state.data?.items.orEmpty()
        if (state.data != null && items.isEmpty()) {
            Box(
                Modifier
                    .padding(horizontal = 20.dp)
                    .fillMaxWidth()
                    .background(PaperDeep, RoundedCornerShape(18.dp)),
            ) {
                EmptyState(
                    title = stringResource(R.string.archive_notifications_empty_title),
                    body = stringResource(R.string.archive_notifications_empty_body),
                )
            }
        }

        LazyColumn(
            contentPadding = PaddingValues(horizontal = 20.dp, vertical = 8.dp),
            modifier = Modifier.fillMaxSize(),
        ) {
            items(items, key = { it.id }) { notification ->
                NotificationRow(
                    notification = notification,
                    onClick = {
                        if (notification.readAt == null) vm.markRead(notification.id)
                        if (notification.entityType == "friend") onOpenFriends()
                    },
                )
            }
            item {
                Text(
                    stringResource(R.string.archive_notifications_footer),
                    style = MaterialTheme.typography.bodySmall,
                    color = Muted,
                    modifier = Modifier.padding(vertical = 16.dp),
                )
            }
        }
    }
}

@Composable
private fun NotificationRow(notification: VhNotification, onClick: () -> Unit) {
    val unread = notification.readAt == null
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp)
            .background(if (unread) Ivory else PaperDeep.copy(alpha = 0.5f), RoundedCornerShape(14.dp))
            .clickable { onClick() }
            .padding(12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        if (notification.actor != null) {
            Avatar(
                notification.actor.displayName,
                notification.actor.avatarUrl,
                size = 36.dp,
            )
        } else {
            Box(
                modifier = Modifier
                    .size(36.dp)
                    .background(SageLight, CircleShape),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    imageVector = when (notification.type) {
                        "follow", "friend_request" -> Icons.Outlined.PersonAdd
                        "friend_accept" -> Icons.Outlined.Groups
                        "like" -> Icons.Outlined.FavoriteBorder
                        "comment" -> Icons.Outlined.ChatBubbleOutline
                        else -> Icons.Outlined.NotificationsNone
                    },
                    contentDescription = null,
                    tint = Forest,
                    modifier = Modifier.size(18.dp),
                )
            }
        }
        Spacer(Modifier.width(10.dp))
        Column(Modifier.weight(1f)) {
            Text(
                text = notification.message ?: stringResource(R.string.archive_notification_fallback),
                style = MaterialTheme.typography.bodyMedium,
                color = Forest,
            )
            Text(
                formatDate(notification.createdAt, withTime = true),
                style = MaterialTheme.typography.bodySmall,
                color = Muted,
            )
        }
        if (unread) {
            Box(
                Modifier
                    .size(7.dp)
                    .background(Clay, CircleShape),
            )
        }
    }
    Spacer(Modifier.height(2.dp))
}
