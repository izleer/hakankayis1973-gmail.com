package app.varlikhafizasi.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Add
import androidx.compose.material.icons.outlined.Delete
import androidx.compose.material.icons.outlined.Share
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
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import app.varlikhafizasi.data.Entry
import app.varlikhafizasi.data.MediaUrl
import app.varlikhafizasi.data.User
import app.varlikhafizasi.ui.VhViewModel
import app.varlikhafizasi.ui.components.Avatar
import app.varlikhafizasi.ui.components.EmptyState
import app.varlikhafizasi.ui.components.ErrorBox
import app.varlikhafizasi.ui.components.LoadingBox
import app.varlikhafizasi.ui.components.MediaThumb
import app.varlikhafizasi.ui.components.Pill
import app.varlikhafizasi.ui.components.SectionLabel
import app.varlikhafizasi.ui.components.VhTopBar
import app.varlikhafizasi.ui.components.entryTypeLabel
import app.varlikhafizasi.ui.components.formatDate
import app.varlikhafizasi.ui.components.visibilityLabel
import app.varlikhafizasi.ui.theme.Clay
import app.varlikhafizasi.ui.theme.Danger
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

private val tabs = listOf("Zaman", "Arşiv", "Ölçümler", "Paylaşım")

@Composable
fun AssetDetailScreen(
    vm: VhViewModel,
    viewer: User,
    assetId: String,
    onBack: () -> Unit,
    onAddEntry: () -> Unit,
) {
    val state by vm.detail.collectAsStateWithLifecycle()
    val formError by vm.formError.collectAsStateWithLifecycle()
    val formBusy by vm.formBusy.collectAsStateWithLifecycle()
    var selectedTab by rememberSaveable { mutableStateOf(0) }
    var pendingDelete by rememberSaveable { mutableStateOf<String?>(null) }
    var lightboxUrl by rememberSaveable { mutableStateOf<String?>(null) }
    var accessName by rememberSaveable { mutableStateOf("") }

    LaunchedEffect(assetId) { vm.loadDetail(assetId) }
    LaunchedEffect(assetId) { vm.clearFormError() }

    val data = state.data
    val asset = data?.detail?.asset

    Box(Modifier.fillMaxSize().background(Paper)) {
        LazyColumn(
            contentPadding = PaddingValues(bottom = 32.dp),
            modifier = Modifier.fillMaxSize(),
        ) {
            item {
                VhTopBar(
                    title = asset?.title ?: "Varlık",
                    onBack = onBack,
                    subtitle = asset?.type?.label,
                    actions = {
                        if (data?.detail?.access?.isOwner == true) {
                            IconButton(onClick = onAddEntry) {
                                Icon(Icons.Outlined.Add, contentDescription = "Kayıt ekle", tint = Forest)
                            }
                        }
                        IconButton(onClick = { selectedTab = 3 }) {
                            Icon(Icons.Outlined.Share, contentDescription = "Paylaşım", tint = Forest)
                        }
                    },
                )
            }

            if (state.loading && data == null) {
                item { LoadingBox() }
            }
            if (state.error != null) {
                item {
                    Box(Modifier.padding(20.dp)) {
                        ErrorBox(state.error ?: "", onRetry = { vm.loadDetail(assetId) })
                    }
                }
            }

            if (data != null) {
                val asset = data.detail.asset
                item { Cover(asset.title, asset.coverUrl, asset.type?.label, asset.visibility) }

                item {
                    Column(Modifier.padding(horizontal = 20.dp, vertical = 16.dp)) {
                        if (data.detail.access.isShared) {
                            Surface(color = SageLight, shape = RoundedCornerShape(8.dp)) {
                                Text(
                                    "Bu varlık sizinle paylaşıldı.",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = Forest,
                                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                                )
                            }
                            Spacer(Modifier.height(10.dp))
                        }
                        if (!asset.description.isNullOrBlank()) {
                            Text(
                                asset.description ?: "",
                                style = MaterialTheme.typography.bodyLarge,
                                color = Forest,
                            )
                            Spacer(Modifier.height(12.dp))
                        }
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            MiniMeta("${asset.entryCount}", "kayıt", Modifier.weight(1f))
                            MiniMeta(
                                asset.acquiredAt?.let { formatDate(it) } ?: "—",
                                "edinme",
                                Modifier.weight(1f),
                            )
                            MiniMeta(asset.locationName ?: "—", "mekân", Modifier.weight(1f))
                        }
                        Spacer(Modifier.height(14.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            if (data.detail.access.isOwner) {
                                Surface(
                                    color = Clay,
                                    shape = RoundedCornerShape(50),
                                    modifier = Modifier
                                        .weight(1f)
                                        .clickable { onAddEntry() },
                                ) {
                                    Text(
                                        "Kayıt ekle",
                                        style = MaterialTheme.typography.labelLarge,
                                        color = Color.White,
                                        modifier = Modifier.padding(vertical = 11.dp),
                                        textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                                    )
                                }
                            }
                            Surface(
                                color = Color.Transparent,
                                border = BorderStroke(1.dp, Line),
                                shape = RoundedCornerShape(50),
                                modifier = Modifier
                                    .weight(1f)
                                    .clickable { selectedTab = 3 },
                            ) {
                                Text(
                                    "Paylaşım",
                                    style = MaterialTheme.typography.labelLarge,
                                    color = Forest,
                                    modifier = Modifier.padding(vertical = 11.dp),
                                    textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                                )
                            }
                        }
                    }
                }

                item {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .horizontalScroll(rememberScrollState())
                            .padding(horizontal = 20.dp, vertical = 4.dp),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        tabs.forEachIndexed { index, label ->
                            Pill(
                                text = label,
                                selected = selectedTab == index,
                                onClick = { selectedTab = index },
                            )
                        }
                    }
                    Spacer(Modifier.height(6.dp))
                }

                when (selectedTab) {
                    0 -> {
                        if (data.detail.entries.isEmpty()) {
                            item {
                                EmptyState(
                                    title = "Henüz bir iz yok",
                                    body = "İlk notunu, fotoğrafını ya da bakım kaydını ekle; zaman çizelgesi burada başlasın.",
                                    actionLabel = if (data.detail.access.isOwner) "Kayıt ekle" else null,
                                    onAction = if (data.detail.access.isOwner) onAddEntry else null,
                                )
                            }
                        }
                        items(data.detail.entries, key = { it.id }) { entry ->
                            EntryCard(
                                entry = entry,
                                canDelete = data.detail.access.isOwner || entry.author?.id == viewer.id,
                                onDelete = { pendingDelete = entry.id },
                                onOpenMedia = { lightboxUrl = it },
                            )
                        }
                    }

                    1 -> {
                        val media = data.detail.entries.flatMap { it.media }
                        if (media.isEmpty()) {
                            item {
                                EmptyState(
                                    title = "Arşiv sessiz",
                                    body = "Kayıtlara eklediğin fotoğraf ve belgeler burada toplanır.",
                                )
                            }
                        } else {
                            item {
                                Text(
                                    "${media.size} dosya · dokunarak büyüt",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = Muted,
                                    modifier = Modifier.padding(horizontal = 20.dp, vertical = 8.dp),
                                )
                            }
                            items(media.chunked(3)) { rowItems ->
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(horizontal = 20.dp, vertical = 3.dp),
                                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                                ) {
                                    rowItems.forEach { mediaItem ->
                                        MediaThumb(
                                            media = mediaItem,
                                            height = 100.dp,
                                            modifier = Modifier.weight(1f),
                                            onClick = {
                                                if (mediaItem.kind == "image") {
                                                    lightboxUrl = MediaUrl.resolve(mediaItem.url)
                                                }
                                            },
                                        )
                                    }
                                    repeat(3 - rowItems.size) {
                                        Spacer(Modifier.weight(1f))
                                    }
                                }
                            }
                        }
                    }

                    2 -> {
                        val measurements = data.measurements
                        if (measurements.isEmpty()) {
                            item {
                                EmptyState(
                                    title = "Ölçüm yok",
                                    body = "Boy, ağırlık, sulama miktarı… Ölçüm tipinde bir kayıt ekleyince burada birikir.",
                                )
                            }
                        } else {
                            item { SectionLabel("Ölçüm geçmişi", modifier = Modifier.padding(horizontal = 20.dp)) }
                            items(measurements, key = { it.id }) { measurement ->
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(horizontal = 20.dp, vertical = 5.dp)
                                        .background(Ivory, RoundedCornerShape(12.dp))
                                        .padding(14.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                ) {
                                    Column(Modifier.weight(1f)) {
                                        Text(
                                            measurement.metric,
                                            style = MaterialTheme.typography.titleMedium,
                                            color = Forest,
                                        )
                                        Text(
                                            formatDate(measurement.measuredAt),
                                            style = MaterialTheme.typography.bodySmall,
                                            color = Muted,
                                        )
                                    }
                                    Text(
                                        "${formatNumber(measurement.value)} ${measurement.unit}",
                                        style = MaterialTheme.typography.titleLarge,
                                        color = Clay,
                                    )
                                }
                            }
                        }
                    }

                    3 -> {
                        item {
                            Column(Modifier.padding(horizontal = 20.dp, vertical = 8.dp)) {
                                SectionLabel("Kimler görebilir?")
                                Text(
                                    "Varlık ${visibilityLabel(asset.visibility).lowercase()} olsa da aşağıdaki kişiler yalnızca bu varlığı görüntüleyebilir. Kayıtların görünürlüğü ayrıca yönetilir.",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = Muted,
                                )
                                Spacer(Modifier.height(14.dp))
                            }
                        }
                        if (data.detail.access.isOwner) {
                            item {
                                Row(
                                    modifier = Modifier.padding(horizontal = 20.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                ) {
                                    OutlinedTextField(
                                        value = accessName,
                                        onValueChange = {
                                            accessName = it
                                            vm.clearFormError()
                                        },
                                        label = { Text("Kullanıcı adı") },
                                        singleLine = true,
                                        enabled = !formBusy,
                                        modifier = Modifier.weight(1f),
                                    )
                                    Spacer(Modifier.width(8.dp))
                                    TextButton(
                                        onClick = {
                                            vm.addAccess(assetId, accessName)
                                            accessName = ""
                                        },
                                        enabled = !formBusy,
                                    ) {
                                        Text("Ekle", color = Forest)
                                    }
                                }
                                if (formError != null) {
                                    Text(
                                        formError ?: "",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = Danger,
                                        modifier = Modifier.padding(horizontal = 20.dp, vertical = 4.dp),
                                    )
                                }
                            }
                            if (data.detail.access.viewers.isEmpty()) {
                                item {
                                    EmptyState(
                                        title = "Kimseyle paylaşılmadı",
                                        body = "Bir kullanıcı adı ekleyerek bu varlığın hikâyesini seçtiğin kişiyle paylaşabilirsin.",
                                    )
                                }
                            }
                            items(data.detail.access.viewers, key = { it.user.id }) { viewerAccess ->
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(horizontal = 20.dp, vertical = 5.dp)
                                        .background(Ivory, RoundedCornerShape(12.dp))
                                        .padding(12.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                ) {
                                    Avatar(
                                        name = viewerAccess.user.displayName,
                                        url = viewerAccess.user.avatarUrl,
                                        size = 36.dp,
                                    )
                                    Spacer(Modifier.width(10.dp))
                                    Column(Modifier.weight(1f)) {
                                        Text(
                                            viewerAccess.user.displayName,
                                            style = MaterialTheme.typography.titleSmall,
                                            color = Forest,
                                        )
                                        Text(
                                            "@${viewerAccess.user.username}",
                                            style = MaterialTheme.typography.bodySmall,
                                            color = Muted,
                                        )
                                    }
                                    IconButton(
                                        onClick = { vm.removeAccess(assetId, viewerAccess.user.id) },
                                    ) {
                                        Icon(
                                            Icons.Outlined.Delete,
                                            contentDescription = "Erişimi kaldır",
                                            tint = Clay,
                                        )
                                    }
                                }
                            }
                        } else {
                            item {
                                EmptyState(
                                    title = "Sadece sahibi yönetir",
                                    body = "Bu varlığın erişim listesini yalnızca sahibi düzenleyebilir.",
                                )
                            }
                        }
                    }
                }
            }

            item {
                Spacer(Modifier.height(24.dp))
                Text(
                    "izleer · ${asset?.type?.label ?: ""} · ${if (asset != null) visibilityLabel(asset.visibility) else ""}",
                    style = MaterialTheme.typography.labelSmall,
                    color = Muted,
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 20.dp),
                )
            }
        }
    }

    pendingDelete?.let { entryId ->
        AlertDialog(
            onDismissRequest = { pendingDelete = null },
            title = { Text("Kayıt silinsin mi?") },
            text = { Text("Bu kayıt ve bağlı medyaları arşivden kaldırılacak. Bu işlem geri alınamaz.") },
            confirmButton = {
                TextButton(onClick = {
                    vm.deleteEntry(assetId, entryId)
                    pendingDelete = null
                }) { Text("Sil", color = Danger) }
            },
            dismissButton = {
                TextButton(onClick = { pendingDelete = null }) { Text("Vazgeç", color = Forest) }
            },
        )
    }

    lightboxUrl?.let { url ->
        Dialog(onDismissRequest = { lightboxUrl = null }) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Color.Black, RoundedCornerShape(14.dp)),
            ) {
                AsyncImage(
                    model = url,
                    contentDescription = null,
                    contentScale = ContentScale.Fit,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(420.dp),
                )
                Text(
                    "Kapat",
                    style = MaterialTheme.typography.labelLarge,
                    color = Color.White,
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .clickable { lightboxUrl = null }
                        .padding(12.dp),
                )
            }
        }
    }
}

@Composable
private fun Cover(
    title: String,
    coverUrl: String?,
    typeLabel: String?,
    visibility: String,
) {
    val resolved = MediaUrl.resolve(coverUrl)
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(240.dp)
            .background(Forest),
    ) {
        if (resolved != null) {
            AsyncImage(
                model = resolved,
                contentDescription = title,
                contentScale = ContentScale.Crop,
                modifier = Modifier.fillMaxSize(),
            )
        } else {
            Box(
                modifier = Modifier
                    .size(130.dp)
                    .align(Alignment.Center)
                    .background(Sage.copy(alpha = 0.25f), RoundedCornerShape(65.dp)),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    typeLabel?.take(1)?.uppercase() ?: "V",
                    style = MaterialTheme.typography.displayLarge,
                    color = Paper.copy(alpha = 0.7f),
                )
            }
        }
        Box(
            modifier = Modifier
                .matchParentSize()
                .background(
                    Brush.verticalGradient(
                        listOf(Color.Transparent, Forest.copy(alpha = 0.86f)),
                    ),
                ),
        )
        Column(
            modifier = Modifier
                .align(Alignment.BottomStart)
                .padding(20.dp),
        ) {
            Text(
                (typeLabel ?: "VARLIK").uppercase(),
                style = MaterialTheme.typography.labelSmall,
                color = Gold,
            )
            Spacer(Modifier.height(4.dp))
            Text(
                title,
                style = MaterialTheme.typography.headlineLarge,
                color = Paper,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
            )
            Spacer(Modifier.height(6.dp))
            Text(
                visibilityLabel(visibility),
                style = MaterialTheme.typography.labelMedium,
                color = Paper.copy(alpha = 0.72f),
            )
        }
    }
}

@Composable
private fun MiniMeta(value: String, label: String, modifier: Modifier = Modifier) {
    Column(
        modifier = modifier
            .background(PaperDeep, RoundedCornerShape(10.dp))
            .padding(horizontal = 10.dp, vertical = 9.dp),
    ) {
        Text(
            value,
            style = MaterialTheme.typography.titleSmall,
            color = Forest,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
        Text(
            label.uppercase(),
            style = MaterialTheme.typography.labelSmall,
            color = Muted,
        )
    }
}

@Composable
private fun EntryCard(
    entry: Entry,
    canDelete: Boolean,
    onDelete: () -> Unit,
    onOpenMedia: (String?) -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 20.dp, vertical = 6.dp)
            .background(Ivory, RoundedCornerShape(16.dp))
            .padding(16.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Surface(color = SageLight, shape = RoundedCornerShape(4.dp)) {
                Text(
                    entryTypeLabel(entry.type).uppercase(),
                    style = MaterialTheme.typography.labelSmall,
                    color = Forest,
                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 3.dp),
                )
            }
            Spacer(Modifier.weight(1f))
            Text(
                formatDate(entry.occurredAt),
                style = MaterialTheme.typography.bodySmall,
                color = Muted,
            )
            if (canDelete) {
                IconButton(onClick = onDelete, modifier = Modifier.size(32.dp)) {
                    Icon(
                        Icons.Outlined.Delete,
                        contentDescription = "Sil",
                        tint = Muted,
                        modifier = Modifier.size(17.dp),
                    )
                }
            }
        }
        if (!entry.title.isNullOrBlank()) {
            Spacer(Modifier.height(6.dp))
            Text(
                entry.title ?: "",
                style = MaterialTheme.typography.titleLarge,
                color = Forest,
            )
        }
        if (!entry.body.isNullOrBlank()) {
            Spacer(Modifier.height(5.dp))
            Text(
                entry.body ?: "",
                style = MaterialTheme.typography.bodyMedium,
                color = Forest.copy(alpha = 0.9f),
            )
        }
        if (entry.media.isNotEmpty()) {
            Spacer(Modifier.height(10.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                entry.media.take(3).forEach { media ->
                    MediaThumb(
                        media = media,
                        height = 96.dp,
                        modifier = Modifier.weight(1f),
                        onClick = { onOpenMedia(MediaUrl.resolve(media.url)) },
                    )
                }
                repeat(3 - entry.media.take(3).size) {
                    Spacer(Modifier.weight(1f))
                }
            }
        }
        Spacer(Modifier.height(10.dp))
        Row(verticalAlignment = Alignment.CenterVertically) {
            entry.author?.let {
                Avatar(it.displayName, it.avatarUrl, size = 22.dp)
                Spacer(Modifier.width(6.dp))
                Text(
                    it.displayName,
                    style = MaterialTheme.typography.bodySmall,
                    color = Muted,
                )
            }
            Spacer(Modifier.weight(1f))
            Text(
                visibilityLabel(entry.visibility),
                style = MaterialTheme.typography.labelSmall,
                color = Muted,
            )
        }
    }
}

private fun formatNumber(value: Double): String =
    if (value % 1.0 == 0.0) value.toInt().toString() else String.format("%.1f", value)
