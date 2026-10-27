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
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.Logout
import androidx.compose.material.icons.outlined.NotificationsNone
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import app.varlikhafizasi.data.FeedPost
import app.varlikhafizasi.data.User
import app.varlikhafizasi.ui.VhViewModel
import app.varlikhafizasi.ui.components.AssetRow
import app.varlikhafizasi.ui.components.Avatar
import app.varlikhafizasi.ui.components.EmptyState
import app.varlikhafizasi.ui.components.ErrorBox
import app.varlikhafizasi.ui.components.GoldRule
import app.varlikhafizasi.ui.components.LoadingBox
import app.varlikhafizasi.ui.components.SectionLabel
import app.varlikhafizasi.ui.components.VhTopBar
import app.varlikhafizasi.ui.components.formatDate
import app.varlikhafizasi.ui.theme.Clay
import app.varlikhafizasi.ui.theme.Danger
import app.varlikhafizasi.ui.theme.Forest
import app.varlikhafizasi.ui.theme.Gold
import app.varlikhafizasi.ui.theme.Line
import app.varlikhafizasi.ui.theme.Muted
import app.varlikhafizasi.ui.theme.Paper
import app.varlikhafizasi.ui.theme.PaperDeep
import app.varlikhafizasi.ui.theme.Sage
import app.varlikhafizasi.ui.theme.Ivory

@Composable
fun ProfileScreen(
    vm: VhViewModel,
    viewer: User,
    onOpenAsset: (String) -> Unit,
    onOpenNotifications: () -> Unit,
) {
    val state by vm.profile.collectAsStateWithLifecycle()
    var confirmLogout by rememberSaveable { mutableStateOf(false) }

    LaunchedEffect(viewer.id) { vm.loadProfile() }

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
            title = "Profil",
            actions = {
                IconButton(onClick = onOpenNotifications) {
                    Icon(Icons.Outlined.NotificationsNone, contentDescription = "Bildirimler", tint = Forest)
                }
                IconButton(onClick = { confirmLogout = true }) {
                    Icon(Icons.AutoMirrored.Outlined.Logout, contentDescription = "Çıkış", tint = Forest)
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
                            Avatar(user.displayName, user.avatarUrl, size = 58.dp)
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
                            Box(
                                Modifier
                                    .size(8.dp)
                                    .background(Gold, RoundedCornerShape(4.dp)),
                            )
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
                            ProfileStat("${stats?.assets ?: 0}", "varlık", Modifier.weight(1f))
                            ProfileStat("${stats?.entries ?: 0}", "kayıt", Modifier.weight(1f))
                            ProfileStat("${stats?.followers ?: 0}", "takipçi", Modifier.weight(1f))
                            ProfileStat("${stats?.following ?: 0}", "takip", Modifier.weight(1f))
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
                SectionLabel("Varlıkların")
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
                            title = "Burası senin arşivin",
                            body = "Henüz bir varlık eklemedin. İlk hikâyeni başlatmak için Varlıklar sekmesini kullan.",
                        )
                    }
                }
            }
            items(assets, key = { it.id }) { asset ->
                AssetRow(
                    asset = asset,
                    onClick = { onOpenAsset(asset.id) },
                    modifier = Modifier.padding(vertical = 3.dp),
                )
            }

            val posts = profileState?.posts.orEmpty()
            if (posts.isNotEmpty()) {
                item {
                    Spacer(Modifier.height(14.dp))
                    SectionLabel("Paylaşımların")
                }
                items(posts, key = { it.id }) { post ->
                    ProfilePost(post)
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
                            "Verilerin senin.",
                            style = MaterialTheme.typography.titleSmall,
                            color = Forest,
                        )
                        Text(
                            "Arşivini dilediğin an dışa aktarabilir, hesabını silebilirsin. Bu işlemler web sürümündeki profil sayfasından yapılır.",
                            style = MaterialTheme.typography.bodySmall,
                            color = Muted,
                        )
                    }
                }
                Spacer(Modifier.height(22.dp))
                Text(
                    "Varlık Hafızası · v1.0",
                    style = MaterialTheme.typography.labelSmall,
                    color = Muted,
                )
                Spacer(Modifier.height(20.dp))
            }
        }
    }

    if (confirmLogout) {
        AlertDialog(
            onDismissRequest = { confirmLogout = false },
            title = { Text("Çıkış yapılsın mı?") },
            text = { Text("Oturumun kapatılacak; arşivin güvende kalacak.") },
            confirmButton = {
                TextButton(onClick = {
                    confirmLogout = false
                    vm.logout()
                }) { Text("Çıkış yap", color = Danger) }
            },
            dismissButton = {
                TextButton(onClick = { confirmLogout = false }) { Text("Vazgeç", color = Forest) }
            },
        )
    }
}

@Composable
private fun ProfileStat(value: String, label: String, modifier: Modifier = Modifier) {
    Column(
        modifier = modifier
            .background(Paper.copy(alpha = 0.07f), RoundedCornerShape(9.dp))
            .padding(horizontal = 8.dp, vertical = 8.dp),
    ) {
        Text(value, style = MaterialTheme.typography.titleLarge, color = Paper)
        Text(
            label.uppercase(),
            style = MaterialTheme.typography.labelSmall,
            color = Sage,
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
            post.body.ifBlank { post.asset?.title ?: "Paylaşım" },
            style = MaterialTheme.typography.bodyMedium,
            color = Forest,
            maxLines = 3,
            overflow = TextOverflow.Ellipsis,
        )
        Row(Modifier.padding(top = 6.dp)) {
            Text(
                "Beğeni ${post.likeCount}",
                style = MaterialTheme.typography.labelSmall,
                color = Clay,
            )
            Spacer(Modifier.width(10.dp))
            Text(
                "Yorum ${post.commentCount}",
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
