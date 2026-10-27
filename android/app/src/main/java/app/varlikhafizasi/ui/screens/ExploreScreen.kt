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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.outlined.ChatBubbleOutline
import androidx.compose.material.icons.outlined.FavoriteBorder
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import app.varlikhafizasi.data.Asset
import app.varlikhafizasi.data.FeedPost
import app.varlikhafizasi.data.MediaUrl
import app.varlikhafizasi.data.User
import app.varlikhafizasi.ui.VhViewModel
import app.varlikhafizasi.ui.components.Avatar
import app.varlikhafizasi.ui.components.EmptyState
import app.varlikhafizasi.ui.components.ErrorBox
import app.varlikhafizasi.ui.components.GoldRule
import app.varlikhafizasi.ui.components.LoadingBox
import app.varlikhafizasi.ui.components.MediaThumb
import app.varlikhafizasi.ui.components.Pill
import app.varlikhafizasi.ui.components.SectionLabel
import app.varlikhafizasi.ui.components.VhTopBar
import app.varlikhafizasi.ui.components.formatDate
import app.varlikhafizasi.ui.theme.Clay
import app.varlikhafizasi.ui.theme.Forest
import app.varlikhafizasi.ui.theme.Gold
import app.varlikhafizasi.ui.theme.Line
import app.varlikhafizasi.ui.theme.Muted
import app.varlikhafizasi.ui.theme.Paper
import app.varlikhafizasi.ui.theme.PaperDeep
import app.varlikhafizasi.ui.theme.Sage
import app.varlikhafizasi.ui.theme.SageLight
import app.varlikhafizasi.ui.theme.Ivory
import coil.compose.AsyncImage

@Composable
fun ExploreScreen(
    vm: VhViewModel,
    onOpenAsset: (String) -> Unit,
) {
    val state by vm.explore.collectAsStateWithLifecycle()

    LaunchedEffect(Unit) {
        if (state.data == null && !state.loading) vm.loadExplore()
    }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(Paper),
        contentPadding = PaddingValues(bottom = 28.dp),
    ) {
        item { VhTopBar(title = "Keşfet", subtitle = "Başkalarının süreçlerinden ilham al") }

        item {
            Surface(
                color = Forest,
                shape = RoundedCornerShape(22.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp),
            ) {
                Column(Modifier.padding(20.dp)) {
                    Text(
                        "MERAKLILARIN ARŞİVİ",
                        style = MaterialTheme.typography.labelSmall,
                        color = Gold,
                    )
                    Spacer(Modifier.height(8.dp))
                    Text(
                        "Her varlık,\nbir süreç.",
                        style = MaterialTheme.typography.headlineLarge,
                        color = Paper,
                    )
                    Spacer(Modifier.height(10.dp))
                    GoldRule()
                    Spacer(Modifier.height(10.dp))
                    Text(
                        "Bonzai budamaları, bir köpeğin ilk yılı, restorasyon notları… Gerçek süreçleri keşfet.",
                        style = MaterialTheme.typography.bodySmall,
                        color = Paper.copy(alpha = 0.7f),
                    )
                }
            }
        }

        val data = state.data
        if (state.loading && data == null) item { LoadingBox() }
        if (state.error != null) {
            item {
                Box(Modifier.padding(20.dp)) {
                    ErrorBox(state.error ?: "", onRetry = { vm.loadExplore() })
                }
            }
        }

        if (data != null && data.publicAssets.isNotEmpty()) {
            item {
                Column(Modifier.padding(top = 18.dp)) {
                    SectionLabel("İlham veren varlıklar", modifier = Modifier.padding(horizontal = 20.dp))
                    LazyRow(
                        contentPadding = PaddingValues(horizontal = 20.dp),
                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                    ) {
                        items(data.publicAssets, key = { it.id }) { asset ->
                            PublicAssetCard(asset, onClick = { onOpenAsset(asset.id) })
                        }
                    }
                }
            }
        }

        if (data != null && data.people.isNotEmpty()) {
            item {
                Column(Modifier.padding(top = 16.dp)) {
                    SectionLabel("Tanışılacak kişiler", modifier = Modifier.padding(horizontal = 20.dp))
                    LazyRow(
                        contentPadding = PaddingValues(horizontal = 20.dp),
                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                    ) {
                        items(data.people, key = { it.id }) { user ->
                            PersonCard(user, onFollow = { vm.follow(user) })
                        }
                    }
                }
            }
        }

        item {
            SectionLabel(
                "Akış",
                modifier = Modifier.padding(start = 20.dp, end = 20.dp, top = 18.dp),
            )
        }

        if (data != null && data.posts.isEmpty()) {
            item {
                Box(
                    Modifier
                        .padding(horizontal = 20.dp)
                        .fillMaxWidth()
                        .background(PaperDeep, RoundedCornerShape(16.dp)),
                ) {
                    EmptyState(
                        title = "Akış sakin",
                        body = "Herkese açık paylaşılan kayıtlar burada görünür. Sen de bir varlığını herkese açarak başlayabilirsin.",
                    )
                }
            }
        }

        items(data?.posts.orEmpty(), key = { it.id }) { post ->
            PostCard(
                post = post,
                onOpenAsset = { onOpenAsset(it) },
                onLike = { vm.toggleLike(post) },
            )
        }

        item {
            Spacer(Modifier.height(8.dp))
            Text(
                "Keşfet yalnızca herkese açık varlıkları ve paylaşımları gösterir. Özel arşivin sana aittir.",
                style = MaterialTheme.typography.bodySmall,
                color = Muted,
                modifier = Modifier.padding(horizontal = 20.dp, vertical = 14.dp),
            )
        }
    }
}

@Composable
private fun PublicAssetCard(asset: Asset, onClick: () -> Unit) {
    val cover = MediaUrl.resolve(asset.coverUrl)
    Surface(
        color = Ivory,
        shape = RoundedCornerShape(16.dp),
        border = BorderStroke(1.dp, Line),
        modifier = Modifier
            .width(172.dp)
            .clickable { onClick() },
    ) {
        Column {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(112.dp)
                    .background(SageLight),
                contentAlignment = Alignment.Center,
            ) {
                if (cover != null) {
                    AsyncImage(
                        model = cover,
                        contentDescription = asset.title,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier.fillMaxSize(),
                    )
                } else {
                    Text(
                        asset.type?.label?.take(1) ?: "V",
                        style = MaterialTheme.typography.headlineMedium,
                        color = Sage,
                    )
                }
            }
            Column(Modifier.padding(10.dp)) {
                Text(
                    asset.type?.label ?: "Varlık",
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
                Text(
                    "@${asset.owner?.username ?: ""}",
                    style = MaterialTheme.typography.bodySmall,
                    color = Muted,
                    maxLines = 1,
                )
            }
        }
    }
}

@Composable
private fun PersonCard(user: User, onFollow: () -> Unit) {
    Surface(
        color = Ivory,
        shape = RoundedCornerShape(14.dp),
        border = BorderStroke(1.dp, Line),
        modifier = Modifier.width(178.dp),
    ) {
        Column(Modifier.padding(12.dp)) {
            Avatar(user.displayName, user.avatarUrl, size = 40.dp)
            Spacer(Modifier.height(8.dp))
            Text(
                user.displayName,
                style = MaterialTheme.typography.titleSmall,
                color = Forest,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            Text(
                "@${user.username}",
                style = MaterialTheme.typography.bodySmall,
                color = Muted,
                maxLines = 1,
            )
            if (!user.bio.isNullOrBlank()) {
                Text(
                    user.bio ?: "",
                    style = MaterialTheme.typography.bodySmall,
                    color = Muted,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )
            }
            Spacer(Modifier.height(8.dp))
            Surface(
                color = if (user.isFollowing) PaperDeep else SageLight,
                shape = RoundedCornerShape(50),
                modifier = Modifier.clickable { onFollow() },
            ) {
                Text(
                    if (user.isFollowing) "Takipte" else "Takip et",
                    style = MaterialTheme.typography.labelSmall,
                    color = Forest,
                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp),
                )
            }
        }
    }
}

@Composable
private fun PostCard(post: FeedPost, onOpenAsset: (String) -> Unit, onLike: () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 20.dp, vertical = 6.dp)
            .background(Ivory, RoundedCornerShape(16.dp))
            .padding(14.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Avatar(post.author.displayName, post.author.avatarUrl, size = 34.dp)
            Spacer(Modifier.width(9.dp))
            Column(Modifier.weight(1f)) {
                Text(
                    post.author.displayName,
                    style = MaterialTheme.typography.titleSmall,
                    color = Forest,
                )
                Text(
                    "@${post.author.username} · ${formatDate(post.createdAt)}",
                    style = MaterialTheme.typography.bodySmall,
                    color = Muted,
                )
            }
            post.asset?.let { asset ->
                Text(
                    text = "Varlık",
                    style = MaterialTheme.typography.labelSmall,
                    color = Clay,
                    modifier = Modifier.clickable { onOpenAsset(asset.id) },
                )
            }
        }

        if (post.body.isNotBlank()) {
            Spacer(Modifier.height(10.dp))
            Text(
                post.body,
                style = MaterialTheme.typography.bodyMedium,
                color = Forest,
            )
        }

        post.asset?.let { asset ->
            Spacer(Modifier.height(10.dp))
            Surface(
                color = PaperDeep,
                shape = RoundedCornerShape(10.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { onOpenAsset(asset.id) },
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    val cover = MediaUrl.resolve(asset.coverUrl)
                    Box(
                        Modifier
                            .size(width = 54.dp, height = 54.dp)
                            .background(SageLight),
                        contentAlignment = Alignment.Center,
                    ) {
                        if (cover != null) {
                            AsyncImage(
                                model = cover,
                                contentDescription = asset.title,
                                contentScale = ContentScale.Crop,
                                modifier = Modifier.size(width = 54.dp, height = 54.dp),
                            )
                        } else {
                            Text("V", color = Sage, style = MaterialTheme.typography.titleMedium)
                        }
                    }
                    Column(Modifier.padding(horizontal = 10.dp, vertical = 6.dp)) {
                        Text(
                            asset.typeLabel ?: "Varlık",
                            style = MaterialTheme.typography.labelSmall,
                            color = Clay,
                        )
                        Text(
                            asset.title,
                            style = MaterialTheme.typography.titleSmall,
                            color = Forest,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                        )
                    }
                }
            }
        }

        if (post.media.isNotEmpty()) {
            Spacer(Modifier.height(10.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                post.media.take(3).forEach { media ->
                    MediaThumb(
                        media = media,
                        height = 130.dp,
                        modifier = Modifier.weight(1f),
                    )
                }
                repeat(3 - post.media.take(3).size) {
                    Spacer(Modifier.weight(1f))
                }
            }
        }

        Spacer(Modifier.height(10.dp))
        Row(verticalAlignment = Alignment.CenterVertically) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.clickable { onLike() },
            ) {
                Icon(
                    imageVector = if (post.likedByMe) Icons.Filled.Favorite else Icons.Outlined.FavoriteBorder,
                    contentDescription = "Beğen",
                    tint = if (post.likedByMe) Clay else Muted,
                    modifier = Modifier.size(19.dp),
                )
                Spacer(Modifier.width(5.dp))
                Text(
                    "${post.likeCount}",
                    style = MaterialTheme.typography.bodySmall,
                    color = Muted,
                )
            }
            Spacer(Modifier.width(16.dp))
            Icon(
                Icons.Outlined.ChatBubbleOutline,
                contentDescription = "Yorum",
                tint = Muted,
                modifier = Modifier.size(18.dp),
            )
            Spacer(Modifier.width(5.dp))
            Text(
                "${post.commentCount}",
                style = MaterialTheme.typography.bodySmall,
                color = Muted,
            )
            Spacer(Modifier.weight(1f))
            Box(
                Modifier
                    .size(6.dp)
                    .background(Gold, CircleShape),
            )
        }
    }
}
