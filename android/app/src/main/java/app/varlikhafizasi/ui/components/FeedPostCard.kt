package app.varlikhafizasi.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.outlined.FavoriteBorder
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import app.varlikhafizasi.R
import app.varlikhafizasi.data.FeedPost
import app.varlikhafizasi.data.MediaUrl
import app.varlikhafizasi.ui.theme.Clay
import app.varlikhafizasi.ui.theme.Danger
import app.varlikhafizasi.ui.theme.Forest
import app.varlikhafizasi.ui.theme.Ivory
import app.varlikhafizasi.ui.theme.Muted
import app.varlikhafizasi.ui.theme.PaperDeep
import app.varlikhafizasi.ui.theme.SageInk
import app.varlikhafizasi.ui.theme.SageLight
import coil.compose.AsyncImage

/**
 * Akış gönderisi kartı. Keşfet ve grup akışı aynı görünümü paylaşır;
 * silme yalnızca yetkili görüntüleyicide gösterilir.
 */
@Composable
fun FeedPostCard(
    post: FeedPost,
    onOpenAsset: (String) -> Unit,
    onLike: () -> Unit,
    canDelete: Boolean = false,
    onDelete: (() -> Unit)? = null,
) {
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
            if (canDelete && onDelete != null) {
                TextButton(
                    onClick = onDelete,
                    contentPadding = PaddingValues(horizontal = 6.dp, vertical = 0.dp),
                ) {
                    Text(
                        text = stringResource(R.string.groups_post_delete),
                        style = MaterialTheme.typography.labelSmall,
                        color = Danger,
                    )
                }
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
                            Text("V", color = SageInk, style = MaterialTheme.typography.titleMedium)
                        }
                    }
                    Column(Modifier.padding(horizontal = 10.dp, vertical = 6.dp)) {
                        Text(
                            asset.typeLabel ?: stringResource(R.string.common_asset),
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
                    contentDescription = stringResource(R.string.explore_like),
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
            if (post.commentCount > 0) {
                Spacer(Modifier.width(16.dp))
                Text(
                    stringResource(R.string.common_comment_count, post.commentCount),
                    style = MaterialTheme.typography.bodySmall,
                    color = Muted,
                )
            }
        }
    }
}
