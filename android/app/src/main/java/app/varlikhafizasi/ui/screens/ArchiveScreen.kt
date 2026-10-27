package app.varlikhafizasi.ui.screens

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.GridItemSpan
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Close
import androidx.compose.material.icons.outlined.Description
import androidx.compose.material.icons.outlined.Movie
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import app.varlikhafizasi.data.ArchiveItem
import app.varlikhafizasi.data.MediaUrl
import app.varlikhafizasi.ui.VhViewModel
import app.varlikhafizasi.ui.components.EmptyState
import app.varlikhafizasi.ui.components.ErrorBox
import app.varlikhafizasi.ui.components.LoadingBox
import app.varlikhafizasi.ui.components.Pill
import app.varlikhafizasi.ui.components.VhTopBar
import app.varlikhafizasi.ui.components.kindLabel
import app.varlikhafizasi.ui.theme.Forest
import app.varlikhafizasi.ui.theme.Gold
import app.varlikhafizasi.ui.theme.Line
import app.varlikhafizasi.ui.theme.Muted
import app.varlikhafizasi.ui.theme.Paper
import app.varlikhafizasi.ui.theme.PaperDeep
import coil.compose.AsyncImage

private val filters = listOf(
    null to "Tümü",
    "image" to "Görsel",
    "document" to "Belge",
    "video" to "Video",
)

@Composable
fun ArchiveScreen(vm: VhViewModel) {
    val state by vm.archive.collectAsStateWithLifecycle()
    var kind by rememberSaveable { mutableStateOf<String?>(null) }
    var query by rememberSaveable { mutableStateOf("") }
    var lightbox by rememberSaveable { mutableStateOf<String?>(null) }
    val context = LocalContext.current

    LaunchedEffect(Unit) {
        if (state.data == null && !state.loading) vm.loadArchive()
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Paper),
    ) {
        VhTopBar(
            title = "Arşiv",
            subtitle = state.data?.let {
                "${it.counts.images} görsel · ${it.counts.documents} belge"
            },
        )

        OutlinedTextField(
            value = query,
            onValueChange = { query = it },
            placeholder = { Text("Arşivde ara", color = Muted) },
            leadingIcon = { Icon(Icons.Outlined.Search, contentDescription = null, tint = Muted) },
            trailingIcon = {
                if (query.isNotEmpty()) {
                    IconButton(onClick = {
                        query = ""
                        vm.loadArchive(kind)
                    }) {
                        Icon(Icons.Outlined.Close, contentDescription = "Temizle", tint = Muted)
                    }
                }
            },
            singleLine = true,
            shape = RoundedCornerShape(50),
            colors = OutlinedTextFieldDefaults.colors(
                focusedContainerColor = Color.Transparent,
                unfocusedContainerColor = Color.Transparent,
                focusedBorderColor = Forest,
                unfocusedBorderColor = Line,
            ),
            keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
            keyboardActions = KeyboardActions(onSearch = { vm.loadArchive(kind, query) }),
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp),
        )

        Row(
            modifier = Modifier.padding(horizontal = 20.dp, vertical = 10.dp),
            horizontalArrangement = Arrangement.spacedBy(7.dp),
        ) {
            filters.forEach { (key, label) ->
                Pill(
                    text = label,
                    selected = kind == key,
                    onClick = {
                        kind = key
                        vm.loadArchive(key, query)
                    },
                )
            }
        }

        if (state.loading && state.data == null) {
            LoadingBox()
        }
        if (state.error != null) {
            Box(Modifier.padding(horizontal = 20.dp)) {
                ErrorBox(state.error ?: "", onRetry = { vm.loadArchive(kind, query) })
            }
        }

        val archiveItems = state.data?.items.orEmpty()
        if (state.data != null && archiveItems.isEmpty()) {
            Box(
                Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp)
                    .background(PaperDeep, RoundedCornerShape(18.dp)),
            ) {
                EmptyState(
                    title = if (query.isBlank()) "Arşiv henüz sessiz" else "Eşleşen dosya yok",
                    body = if (query.isBlank()) {
                        "Varlıklarına eklediğin fotoğraf ve belgeler burada birikir."
                    } else {
                        "Farklı bir kelimeyle aramayı dene."
                    },
                )
            }
        }

        LazyVerticalGrid(
            columns = GridCells.Fixed(3),
            contentPadding = PaddingValues(start = 20.dp, end = 20.dp, top = 4.dp, bottom = 28.dp),
            horizontalArrangement = Arrangement.spacedBy(6.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp),
            modifier = Modifier.weight(1f),
        ) {
            item(span = { GridItemSpan(maxLineSpan) }) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 4.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        "ARŞİVDEKİ İZLER",
                        style = MaterialTheme.typography.labelMedium,
                        color = Muted,
                    )
                    Spacer(Modifier.weight(1f))
                    Text(
                        "${state.data?.counts?.total ?: 0} dosya",
                        style = MaterialTheme.typography.labelSmall,
                        color = Gold,
                    )
                }
            }
            items(archiveItems, key = { it.id }) { item ->
                ArchiveCell(
                    item = item,
                    onClick = {
                        val url = MediaUrl.resolve(item.url)
                        if (item.kind == "image") {
                            lightbox = url
                        } else if (url != null) {
                            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                            runCatching { context.startActivity(intent) }
                        }
                    },
                )
            }
            item(span = { GridItemSpan(maxLineSpan) }) {
                Text(
                    "Fotoğrafa dokun, büyüt. Belge ve videolar cihazın görüntüleyicisiyle açılır.",
                    style = MaterialTheme.typography.bodySmall,
                    color = Muted,
                    modifier = Modifier.padding(top = 12.dp),
                )
            }
        }
    }

    lightbox?.let { url ->
        Dialog(onDismissRequest = { lightbox = null }) {
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
                        .height(430.dp),
                )
                Text(
                    "Kapat",
                    style = MaterialTheme.typography.labelLarge,
                    color = Color.White,
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .clickable { lightbox = null }
                        .padding(12.dp),
                )
            }
        }
    }
}

@Composable
private fun ArchiveCell(item: ArchiveItem, onClick: () -> Unit) {
    val url = MediaUrl.resolve(item.url)
    Column(
        modifier = Modifier
            .aspectRatio(1f)
            .background(PaperDeep, RoundedCornerShape(10.dp))
            .clickable { onClick() },
    ) {
        if (item.kind == "image" && url != null) {
            Box(Modifier.fillMaxSize()) {
                AsyncImage(
                    model = url,
                    contentDescription = item.originalName ?: item.asset?.title,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.fillMaxSize(),
                )
                Text(
                    text = item.asset?.title ?: "",
                    style = MaterialTheme.typography.labelSmall,
                    color = Color.White,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier
                        .align(Alignment.BottomStart)
                        .fillMaxWidth()
                        .background(Forest.copy(alpha = 0.55f))
                        .padding(horizontal = 6.dp, vertical = 4.dp),
                )
            }
        } else {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(6.dp),
                verticalArrangement = Arrangement.Center,
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Icon(
                    imageVector = if (item.kind == "video") Icons.Outlined.Movie else Icons.Outlined.Description,
                    contentDescription = kindLabel(item.kind),
                    tint = Forest,
                    modifier = Modifier.size(22.dp),
                )
                Spacer(Modifier.height(4.dp))
                Text(
                    text = item.originalName ?: kindLabel(item.kind),
                    style = MaterialTheme.typography.labelSmall,
                    color = Forest,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.padding(horizontal = 2.dp),
                )
            }
        }
    }
}
