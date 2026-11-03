package app.varlikhafizasi.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowForward
import androidx.compose.material.icons.outlined.NotificationsNone
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import app.varlikhafizasi.data.Entry
import app.varlikhafizasi.data.User
import app.varlikhafizasi.ui.VhViewModel
import app.varlikhafizasi.ui.components.AssetRow
import app.varlikhafizasi.ui.components.EmptyState
import app.varlikhafizasi.ui.components.ErrorBox
import app.varlikhafizasi.ui.components.GoldRule
import app.varlikhafizasi.ui.components.LoadingBox
import app.varlikhafizasi.ui.components.SectionLabel
import app.varlikhafizasi.ui.components.entryTypeLabel
import app.varlikhafizasi.ui.components.formatDate
import app.varlikhafizasi.ui.theme.Clay
import app.varlikhafizasi.ui.theme.Forest
import app.varlikhafizasi.ui.theme.Gold
import app.varlikhafizasi.ui.theme.Line
import app.varlikhafizasi.ui.theme.Muted
import app.varlikhafizasi.ui.theme.Paper
import app.varlikhafizasi.ui.theme.PaperDeep
import app.varlikhafizasi.ui.theme.Sage
import app.varlikhafizasi.ui.theme.Ivory

@Composable
fun HomeScreen(
    vm: VhViewModel,
    viewer: User,
    onOpenAsset: (String) -> Unit,
    onOpenAssets: () -> Unit,
    onOpenArchive: () -> Unit,
    onOpenNotifications: () -> Unit,
    onNewAsset: () -> Unit,
) {
    val home by vm.home.collectAsStateWithLifecycle()

    LaunchedEffect(Unit) {
        if (home.data == null && !home.loading) vm.loadHome()
    }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(Paper),
        contentPadding = androidx.compose.foundation.layout.PaddingValues(
            start = 20.dp,
            end = 20.dp,
            top = 14.dp,
            bottom = 28.dp,
        ),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text(
                        "İZLEER",
                        style = MaterialTheme.typography.labelSmall,
                        color = Clay,
                    )
                    Spacer(Modifier.height(3.dp))
                    Text(
                        text = "Merhaba, ${viewer.displayName.substringBefore(' ')}.",
                        style = MaterialTheme.typography.headlineMedium,
                        color = Forest,
                    )
                    Text(
                        "Bugün hafızana ne eklenecek?",
                        style = MaterialTheme.typography.bodySmall,
                        color = Muted,
                    )
                }
                IconButton(onClick = onOpenNotifications) {
                    Icon(
                        Icons.Outlined.NotificationsNone,
                        contentDescription = "Bildirimler",
                        tint = Forest,
                    )
                }
            }
        }

        item {
            Surface(
                color = Forest,
                shape = RoundedCornerShape(24.dp),
                modifier = Modifier.fillMaxWidth(),
            ) {
                Column(Modifier.padding(20.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            "HAFIZA ÖZETİ",
                            style = MaterialTheme.typography.labelSmall,
                            color = Gold,
                        )
                        Spacer(Modifier.weight(1f))
                        Box(
                            Modifier
                                .size(8.dp)
                                .background(Gold, CircleShape),
                        )
                    }
                    Spacer(Modifier.height(12.dp))
                    val stats = home.data?.stats
                    Text(
                        text = if (stats != null) {
                            "${stats.assets} varlığın\n${stats.entries} iz bıraktı."
                        } else {
                            "Her şeyin bir\nhikâyesi var."
                        },
                        style = MaterialTheme.typography.headlineLarge,
                        color = Paper,
                    )
                    Spacer(Modifier.height(16.dp))
                    GoldRule(Modifier.background(Gold))
                    Spacer(Modifier.height(16.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        DarkStat(
                            value = stats?.assets?.toString() ?: "—",
                            label = "Varlık",
                            modifier = Modifier.weight(1f),
                        )
                        DarkStat(
                            value = stats?.entries?.toString() ?: "—",
                            label = "Kayıt",
                            modifier = Modifier.weight(1f),
                        )
                        DarkStat(
                            value = stats?.media?.toString() ?: "—",
                            label = "Medya",
                            modifier = Modifier.weight(1f),
                        )
                    }
                }
            }
        }

        item {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Surface(
                    color = Clay,
                    shape = RoundedCornerShape(50),
                    modifier = Modifier
                        .weight(1f)
                        .clickable { onNewAsset() },
                ) {
                    Row(
                        Modifier.padding(vertical = 12.dp),
                        horizontalArrangement = Arrangement.Center,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text(
                            "Yeni varlık",
                            style = MaterialTheme.typography.labelLarge,
                            color = Color.White,
                        )
                        Spacer(Modifier.size(6.dp))
                        Icon(
                            Icons.AutoMirrored.Outlined.ArrowForward,
                            contentDescription = null,
                            tint = Color.White,
                            modifier = Modifier.size(15.dp),
                        )
                    }
                }
                Surface(
                    color = Color.Transparent,
                    shape = RoundedCornerShape(50),
                    border = BorderStroke(1.dp, Line),
                    modifier = Modifier
                        .weight(1f)
                        .clickable { onOpenArchive() },
                ) {
                    Text(
                        "Arşivi gez",
                        style = MaterialTheme.typography.labelLarge,
                        color = Forest,
                        modifier = Modifier.padding(vertical = 12.dp),
                        textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                    )
                }
            }
        }

        if (home.error != null) {
            item { ErrorBox(home.error ?: "", onRetry = { vm.loadHome() }) }
        }
        if (home.loading && home.data == null) {
            item { LoadingBox() }
        }

        val assets = home.data?.assets.orEmpty()
        item {
            Row(verticalAlignment = Alignment.Bottom) {
                SectionLabel("Varlıkların")
                Spacer(Modifier.weight(1f))
                Text(
                    "Tümü",
                    style = MaterialTheme.typography.labelLarge,
                    color = Clay,
                    modifier = Modifier
                        .clickable { onOpenAssets() }
                        .padding(bottom = 6.dp),
                )
            }
        }

        if (!home.loading && home.data != null && assets.isEmpty()) {
            item {
                Surface(
                    color = Ivory,
                    shape = RoundedCornerShape(16.dp),
                    border = BorderStroke(1.dp, Line),
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    EmptyState(
                        title = "İlk izi bırak",
                        body = "Bir bonsai, bir dost ya da duvardaki tablo… İlk varlığını ekle, hikâyesi burada başlasın.",
                        actionLabel = "Yeni varlık",
                        onAction = onNewAsset,
                    )
                }
            }
        }

        items(assets.take(5), key = { it.id }) { asset ->
            AssetRow(asset = asset, onClick = { onOpenAsset(asset.id) })
        }

        val recent = home.data?.stats?.recentEntries.orEmpty()
        if (recent.isNotEmpty()) {
            item {
                Spacer(Modifier.height(8.dp))
                SectionLabel("Son hareketler")
            }
            items(recent.take(5), key = { it.id }) { entry ->
                RecentEntry(entry = entry, onClick = { onOpenAsset(entry.assetId) })
            }
        }

        item {
            Spacer(Modifier.height(10.dp))
            Surface(
                color = PaperDeep,
                shape = RoundedCornerShape(16.dp),
                modifier = Modifier.fillMaxWidth(),
            ) {
                Column(Modifier.padding(18.dp)) {
                    Text(
                        "“Bir şeyi saklamak,\nonu yeniden bakmak içindir.”",
                        style = MaterialTheme.typography.titleLarge,
                        color = Forest,
                    )
                    Spacer(Modifier.height(8.dp))
                    Text(
                        "izleer · günlük arşiv",
                        style = MaterialTheme.typography.labelSmall,
                        color = Muted,
                    )
                }
            }
        }
    }
}

@Composable
private fun DarkStat(value: String, label: String, modifier: Modifier = Modifier) {
    Column(
        modifier = modifier
            .background(Paper.copy(alpha = 0.07f), RoundedCornerShape(10.dp))
            .padding(horizontal = 10.dp, vertical = 9.dp),
    ) {
        Text(
            value,
            style = MaterialTheme.typography.headlineSmall,
            color = Paper,
        )
        Text(
            label.uppercase(),
            style = MaterialTheme.typography.labelSmall,
            color = Sage,
        )
    }
}

@Composable
private fun RecentEntry(entry: Entry, onClick: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() }
            .padding(vertical = 6.dp),
        verticalAlignment = Alignment.Top,
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier.padding(top = 4.dp),
        ) {
            Box(
                Modifier
                    .size(9.dp)
                    .background(Clay, CircleShape),
            )
            Box(
                Modifier
                    .size(width = 1.dp, height = 46.dp)
                    .background(Line),
            )
        }
        Spacer(Modifier.size(12.dp))
        Column(Modifier.weight(1f)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    entryTypeLabel(entry.type).uppercase(),
                    style = MaterialTheme.typography.labelSmall,
                    color = Clay,
                )
                Spacer(Modifier.weight(1f))
                Text(
                    formatDate(entry.occurredAt),
                    style = MaterialTheme.typography.bodySmall,
                    color = Muted,
                )
            }
            Spacer(Modifier.height(3.dp))
            Text(
                text = entry.title ?: entry.asset?.title ?: "Kayıt",
                style = MaterialTheme.typography.titleMedium,
                color = Forest,
                fontWeight = FontWeight.SemiBold,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
            )
            if (!entry.body.isNullOrBlank()) {
                Text(
                    entry.body ?: "",
                    style = MaterialTheme.typography.bodySmall,
                    color = Muted,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )
            }
            Text(
                text = entry.asset?.title ?: "Varlık",
                style = MaterialTheme.typography.labelSmall,
                color = Sage,
                modifier = Modifier.padding(top = 3.dp),
            )
        }
    }
}
