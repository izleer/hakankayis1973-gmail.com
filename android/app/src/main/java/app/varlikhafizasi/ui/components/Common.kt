package app.varlikhafizasi.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material.icons.outlined.ChevronRight
import androidx.compose.material.icons.outlined.Description
import androidx.compose.material.icons.outlined.Image
import androidx.compose.material.icons.outlined.Movie
import androidx.compose.material.icons.outlined.NotificationsNone
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import app.varlikhafizasi.R
import app.varlikhafizasi.data.Asset
import app.varlikhafizasi.data.Media
import app.varlikhafizasi.data.MediaUrl
import app.varlikhafizasi.ui.theme.Clay
import app.varlikhafizasi.ui.theme.Danger
import app.varlikhafizasi.ui.theme.Forest
import app.varlikhafizasi.ui.theme.Gold
import app.varlikhafizasi.ui.theme.Line
import app.varlikhafizasi.ui.theme.Muted
import app.varlikhafizasi.ui.theme.Paper
import app.varlikhafizasi.ui.theme.PaperDeep
import app.varlikhafizasi.ui.theme.Sage
import app.varlikhafizasi.ui.theme.SageInk
import app.varlikhafizasi.ui.theme.SageLight
import app.varlikhafizasi.ui.theme.Ivory
import coil.compose.AsyncImage
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale

private val appLocale: Locale
    get() = Locale.getDefault()

fun formatDate(value: String?, withTime: Boolean = false): String {
    if (value.isNullOrBlank()) return ""
    val pattern = if (withTime) "d MMMM yyyy · HH:mm" else "d MMMM yyyy"
    val formatter = DateTimeFormatter.ofPattern(pattern, appLocale)
    return runCatching {
        formatter.withZone(ZoneId.systemDefault()).format(Instant.parse(value))
    }.getOrElse {
        runCatching { LocalDate.parse(value.take(10)).format(formatter) }
            .getOrElse { value.take(10) }
    }
}

fun formatDateTime(millis: Long): String =
    DateTimeFormatter.ofPattern("d MMMM yyyy · HH:mm", appLocale)
        .withZone(ZoneId.systemDefault())
        .format(Instant.ofEpochMilli(millis))

@Composable
fun entryTypeLabel(type: String): String = stringResource(
    when (type) {
        "photo" -> R.string.entry_type_photo
        "maintenance" -> R.string.entry_type_maintenance
        "acquisition" -> R.string.entry_type_acquisition
        "measurement" -> R.string.entry_type_measurement
        "health" -> R.string.entry_type_health
        "event" -> R.string.entry_type_event
        "document" -> R.string.entry_type_document
        else -> R.string.entry_type_note
    },
)

@Composable
fun visibilityLabel(visibility: String): String = stringResource(
    when (visibility) {
        "public" -> R.string.visibility_public
        "selected" -> R.string.visibility_selected
        else -> R.string.visibility_private
    },
)

@Composable
fun kindLabel(kind: String): String = stringResource(
    when (kind) {
        "document" -> R.string.kind_document
        "video" -> R.string.kind_video
        else -> R.string.kind_image
    },
)

@Composable
fun NotificationBell(unreadCount: Int, onClick: () -> Unit, tint: Color = Forest) {
    IconButton(onClick = onClick) {
        Box(contentAlignment = Alignment.Center) {
            Icon(
                Icons.Outlined.NotificationsNone,
                contentDescription = if (unreadCount > 0) {
                    stringResource(R.string.common_notifications_unread, unreadCount)
                } else {
                    stringResource(R.string.common_notifications)
                },
                tint = tint,
            )
            if (unreadCount > 0) {
                Box(
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .size(16.dp)
                        .background(Clay, CircleShape),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        text = if (unreadCount > 9) "9+" else unreadCount.toString(),
                        style = MaterialTheme.typography.labelSmall.copy(
                            fontSize = 9.sp,
                            letterSpacing = 0.sp,
                        ),
                        color = Color.White,
                    )
                }
            }
        }
    }
}

@Composable
fun VhTopBar(
    title: String,
    onBack: (() -> Unit)? = null,
    subtitle: String? = null,
    actions: @Composable RowScope.() -> Unit = {},
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 12.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        if (onBack != null) {
            IconButton(onClick = onBack) {
                Icon(
                    Icons.AutoMirrored.Outlined.ArrowBack,
                    contentDescription = stringResource(R.string.common_back),
                    tint = Forest,
                )
            }
            Spacer(Modifier.width(2.dp))
        } else {
            Spacer(Modifier.width(10.dp))
        }
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = title,
                style = MaterialTheme.typography.titleLarge,
                color = Forest,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            if (subtitle != null) {
                Text(
                    text = subtitle,
                    style = MaterialTheme.typography.bodySmall,
                    color = Muted,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
        }
        actions()
    }
}

@Composable
fun SectionLabel(text: String, light: Boolean = false, modifier: Modifier = Modifier) {
    Text(
        text = text.uppercase(appLocale),
        style = MaterialTheme.typography.labelMedium,
        color = if (light) Paper.copy(alpha = 0.66f) else Muted,
        letterSpacing = MaterialTheme.typography.labelMedium.letterSpacing,
        modifier = modifier.padding(vertical = 6.dp),
    )
}

@Composable
fun Pill(
    text: String,
    selected: Boolean = false,
    onClick: (() -> Unit)? = null,
    modifier: Modifier = Modifier,
) {
    val background = if (selected) Forest else Color.Transparent
    val content = if (selected) Paper else Forest
    Surface(
        modifier = modifier.then(if (onClick != null) Modifier.clickable { onClick() } else Modifier),
        shape = RoundedCornerShape(50),
        color = background,
        border = BorderStroke(1.dp, if (selected) Forest else Line),
    ) {
        Text(
            text = text,
            style = MaterialTheme.typography.labelLarge,
            color = content,
            modifier = Modifier.padding(horizontal = 13.dp, vertical = 7.dp),
            maxLines = 1,
        )
    }
}

@Composable
fun VisibilityTag(visibility: String) {
    val background = when (visibility) {
        "public" -> SageLight
        "selected" -> Color(0xFFF0E6CF)
        else -> PaperDeep
    }
    Surface(shape = RoundedCornerShape(4.dp), color = background) {
        Text(
            text = visibilityLabel(visibility),
            style = MaterialTheme.typography.labelSmall,
            color = Forest,
            modifier = Modifier.padding(horizontal = 6.dp, vertical = 3.dp),
        )
    }
}

@Composable
fun Avatar(name: String, url: String?, size: Dp = 38.dp) {
    val resolved = MediaUrl.resolve(url)
    Box(
        modifier = Modifier
            .size(size)
            .clip(CircleShape)
            .background(SageLight),
        contentAlignment = Alignment.Center,
    ) {
        if (!resolved.isNullOrBlank()) {
            AsyncImage(
                model = resolved,
                contentDescription = name,
                contentScale = ContentScale.Crop,
                modifier = Modifier.size(size),
            )
        } else {
            Text(
                text = name.trim().firstOrNull()?.uppercase(appLocale) ?: "?",
                style = MaterialTheme.typography.titleMedium,
                color = Forest,
            )
        }
    }
}

@Composable
fun AssetRow(asset: Asset, onClick: () -> Unit, modifier: Modifier = Modifier) {
    Surface(
        modifier = modifier.fillMaxWidth().clickable { onClick() },
        color = Ivory,
        shape = RoundedCornerShape(14.dp),
        border = BorderStroke(1.dp, Line),
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
                        text = asset.type?.label?.take(1)?.uppercase(appLocale) ?: "V",
                        style = MaterialTheme.typography.headlineMedium,
                        color = SageInk,
                        modifier = Modifier.align(Alignment.Center),
                    )
                }
            }
            Column(
                modifier = Modifier
                    .weight(1f)
                    .padding(horizontal = 14.dp, vertical = 10.dp),
            ) {
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
                    Spacer(Modifier.width(8.dp))
                    VisibilityTag(asset.visibility)
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

@Composable
fun MediaThumb(
    media: Media,
    modifier: Modifier = Modifier,
    height: Dp = 120.dp,
    onClick: (() -> Unit)? = null,
) {
    val resolved = MediaUrl.resolve(media.url)
    Box(
        modifier = modifier
            .height(height)
            .clip(RoundedCornerShape(10.dp))
            .background(PaperDeep)
            .then(if (onClick != null) Modifier.clickable { onClick() } else Modifier),
        contentAlignment = Alignment.Center,
    ) {
        when {
            media.kind == "image" && resolved != null -> AsyncImage(
                model = resolved,
                contentDescription = media.originalName,
                contentScale = ContentScale.Crop,
                modifier = Modifier.matchParentSize(),
            )
            else -> Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Icon(
                    imageVector = when (media.kind) {
                        "document" -> Icons.Outlined.Description
                        "video" -> Icons.Outlined.Movie
                        else -> Icons.Outlined.Image
                    },
                    contentDescription = null,
                    tint = SageInk,
                    modifier = Modifier.size(26.dp),
                )
                Spacer(Modifier.height(6.dp))
                Text(
                    text = media.originalName ?: kindLabel(media.kind),
                    style = MaterialTheme.typography.bodySmall,
                    color = Muted,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.padding(horizontal = 8.dp),
                )
            }
        }
    }
}

@Composable
fun EmptyState(
    title: String,
    body: String,
    actionLabel: String? = null,
    onAction: (() -> Unit)? = null,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier.fillMaxWidth().padding(vertical = 36.dp, horizontal = 18.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Box(
            modifier = Modifier
                .size(46.dp)
                .clip(CircleShape)
                .background(SageLight),
            contentAlignment = Alignment.Center,
        ) {
            Box(
                modifier = Modifier
                    .size(18.dp)
                    .clip(CircleShape)
                    .background(Sage),
            )
        }
        Spacer(Modifier.height(14.dp))
        Text(title, style = MaterialTheme.typography.titleLarge, color = Forest)
        Spacer(Modifier.height(6.dp))
        Text(
            body,
            style = MaterialTheme.typography.bodyMedium,
            color = Muted,
            modifier = Modifier.padding(horizontal = 12.dp),
        )
        if (actionLabel != null && onAction != null) {
            Spacer(Modifier.height(14.dp))
            Surface(
                color = Forest,
                shape = RoundedCornerShape(50),
                modifier = Modifier.clickable { onAction() },
            ) {
                Text(
                    actionLabel,
                    style = MaterialTheme.typography.labelLarge,
                    color = Paper,
                    modifier = Modifier.padding(horizontal = 18.dp, vertical = 10.dp),
                )
            }
        }
    }
}

@Composable
fun ErrorBox(message: String, onRetry: (() -> Unit)? = null) {
    Surface(
        color = Color(0xFFF7E7E2),
        shape = RoundedCornerShape(12.dp),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(Modifier.padding(16.dp)) {
            Text(
                stringResource(R.string.common_error_title),
                style = MaterialTheme.typography.titleSmall,
                color = Danger,
            )
            Spacer(Modifier.height(4.dp))
            Text(message, style = MaterialTheme.typography.bodyMedium, color = Forest)
            if (onRetry != null) {
                Spacer(Modifier.height(10.dp))
                Text(
                    stringResource(R.string.common_retry),
                    style = MaterialTheme.typography.labelLarge,
                    color = Danger,
                    modifier = Modifier.clickable { onRetry() },
                )
            }
        }
    }
}

@Composable
fun LoadingBox(modifier: Modifier = Modifier) {
    Box(modifier.fillMaxWidth().padding(40.dp), contentAlignment = Alignment.Center) {
        CircularProgressIndicator(color = Forest, strokeWidth = 2.dp, modifier = Modifier.size(26.dp))
    }
}

@Composable
fun StatTile(value: String, label: String, modifier: Modifier = Modifier, light: Boolean = false) {
    Column(
        modifier = modifier
            .background(if (light) Forest.copy(alpha = 0.04f) else PaperDeep, RoundedCornerShape(12.dp))
            .padding(horizontal = 12.dp, vertical = 12.dp),
    ) {
        Text(
            value,
            style = MaterialTheme.typography.headlineSmall,
            color = if (light) Forest else Forest,
        )
        Spacer(Modifier.height(2.dp))
        Text(label.uppercase(appLocale), style = MaterialTheme.typography.labelSmall, color = Muted)
    }
}

@Composable
fun GoldRule(modifier: Modifier = Modifier) {
    Box(
        modifier
            .width(42.dp)
            .height(2.dp)
            .background(Gold, RoundedCornerShape(2.dp)),
    )
}

@Composable
fun MetaRow(vararg parts: Pair<String, String>) {
    Row(horizontalArrangement = Arrangement.spacedBy(14.dp)) {
        parts.forEach { (label, value) ->
            Column {
                Text(label.uppercase(appLocale), style = MaterialTheme.typography.labelSmall, color = Muted)
                Text(value, style = MaterialTheme.typography.titleSmall, color = Forest, fontWeight = FontWeight.SemiBold)
            }
        }
    }
}
