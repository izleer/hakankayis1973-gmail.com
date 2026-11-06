package app.varlikhafizasi.ui.screens

import androidx.compose.foundation.BorderStroke
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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import app.varlikhafizasi.R
import app.varlikhafizasi.data.Group
import app.varlikhafizasi.data.MediaUrl
import app.varlikhafizasi.ui.VhViewModel
import app.varlikhafizasi.ui.components.EmptyState
import app.varlikhafizasi.ui.components.ErrorBox
import app.varlikhafizasi.ui.components.LoadingBox
import app.varlikhafizasi.ui.components.SectionLabel
import app.varlikhafizasi.ui.components.VhTopBar
import app.varlikhafizasi.ui.components.visibilityLabel
import app.varlikhafizasi.ui.theme.Clay
import app.varlikhafizasi.ui.theme.Forest
import app.varlikhafizasi.ui.theme.Ivory
import app.varlikhafizasi.ui.theme.Line
import app.varlikhafizasi.ui.theme.Muted
import app.varlikhafizasi.ui.theme.Paper
import app.varlikhafizasi.ui.theme.PaperDeep
import app.varlikhafizasi.ui.theme.SageInk
import app.varlikhafizasi.ui.theme.SageLight
import coil.compose.AsyncImage

@Composable
fun GroupsScreen(
    vm: VhViewModel,
    onOpenGroup: (String) -> Unit,
) {
    val state by vm.groups.collectAsStateWithLifecycle()

    LaunchedEffect(Unit) {
        if (state.data == null && !state.loading) vm.loadGroups()
    }

    val data = state.data

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(Paper),
        contentPadding = PaddingValues(bottom = 28.dp),
    ) {
        item {
            VhTopBar(
                title = stringResource(R.string.nav_groups),
                subtitle = stringResource(R.string.groups_subtitle),
            )
        }

        if (state.loading && data == null) item { LoadingBox() }
        if (state.error != null) {
            item {
                Box(Modifier.padding(horizontal = 20.dp)) {
                    ErrorBox(state.error ?: "", onRetry = { vm.loadGroups() })
                }
            }
        }

        item {
            SectionLabel(
                stringResource(R.string.groups_mine_title),
                modifier = Modifier.padding(horizontal = 20.dp, vertical = 8.dp),
            )
        }

        if (data != null && data.mine.isEmpty()) {
            item {
                Box(
                    Modifier
                        .padding(horizontal = 20.dp)
                        .fillMaxWidth()
                        .background(PaperDeep, RoundedCornerShape(18.dp)),
                ) {
                    EmptyState(
                        title = stringResource(R.string.groups_mine_empty_title),
                        body = stringResource(R.string.groups_mine_empty_body),
                    )
                }
            }
        } else {
            items(data?.mine.orEmpty(), key = { "mine-${it.id}" }) { group ->
                GroupCard(
                    group = group,
                    modifier = Modifier.padding(horizontal = 20.dp, vertical = 4.dp),
                    onClick = { onOpenGroup(group.slug) },
                )
            }
        }

        item {
            SectionLabel(
                stringResource(R.string.groups_discover_title),
                modifier = Modifier.padding(horizontal = 20.dp, vertical = 8.dp),
            )
        }

        if (data != null && data.discover.isEmpty()) {
            item {
                Box(
                    Modifier
                        .padding(horizontal = 20.dp)
                        .fillMaxWidth()
                        .background(PaperDeep, RoundedCornerShape(18.dp)),
                ) {
                    EmptyState(
                        title = stringResource(R.string.groups_discover_empty_title),
                        body = stringResource(R.string.groups_discover_empty_body),
                    )
                }
            }
        } else {
            items(data?.discover.orEmpty(), key = { "discover-${it.id}" }) { group ->
                GroupCard(
                    group = group,
                    modifier = Modifier.padding(horizontal = 20.dp, vertical = 4.dp),
                    onClick = { onOpenGroup(group.slug) },
                )
            }
        }
    }
}

@Composable
private fun GroupCard(
    group: Group,
    modifier: Modifier = Modifier,
    onClick: () -> Unit,
) {
    Surface(
        color = Ivory,
        shape = RoundedCornerShape(16.dp),
        border = BorderStroke(1.dp, Line),
        modifier = modifier
            .fillMaxWidth()
            .clickable { onClick() },
    ) {
        Row(
            modifier = Modifier.padding(12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(
                modifier = Modifier
                    .size(76.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(SageLight),
                contentAlignment = Alignment.Center,
            ) {
                val cover = MediaUrl.resolve(group.coverUrl)
                if (cover != null) {
                    AsyncImage(
                        model = cover,
                        contentDescription = group.name,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier.matchParentSize(),
                    )
                } else {
                    Text(
                        text = group.name.trim().firstOrNull()?.uppercaseChar()?.toString() ?: "G",
                        style = MaterialTheme.typography.headlineMedium,
                        color = SageInk,
                    )
                }
            }

            Spacer(Modifier.width(12.dp))

            Column(Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = group.category ?: visibilityLabel(group.visibility),
                        style = MaterialTheme.typography.labelSmall,
                        color = Clay,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                    if (group.joinPolicy == "approval" && group.role == null) {
                        Spacer(Modifier.width(6.dp))
                        Text(
                            text = stringResource(R.string.groups_join_policy_approval),
                            style = MaterialTheme.typography.labelSmall,
                            color = Muted,
                            maxLines = 1,
                        )
                    }
                }
                Spacer(Modifier.height(2.dp))
                Text(
                    text = group.name,
                    style = MaterialTheme.typography.titleMedium,
                    color = Forest,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )
                if (!group.description.isNullOrBlank()) {
                    Text(
                        text = group.description ?: "",
                        style = MaterialTheme.typography.bodySmall,
                        color = Muted,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
                Spacer(Modifier.height(6.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = pluralStringResource(
                            R.plurals.groups_member_count,
                            group.memberCount,
                            group.memberCount,
                        ),
                        style = MaterialTheme.typography.bodySmall,
                        color = Muted,
                    )
                    val role = roleLabel(group.role)
                    if (role != null) {
                        Spacer(Modifier.width(8.dp))
                        RoleTag(role)
                    }
                }
            }
        }
    }
}

@Composable
internal fun roleLabel(role: String?): String? = when (role) {
    "owner" -> stringResource(R.string.groups_role_owner)
    "admin" -> stringResource(R.string.groups_role_admin)
    "moderator" -> stringResource(R.string.groups_role_moderator)
    "member" -> stringResource(R.string.groups_role_member)
    else -> null
}

@Composable
internal fun RoleTag(text: String) {
    Surface(
        shape = RoundedCornerShape(4.dp),
        color = SageLight,
    ) {
        Text(
            text = text,
            style = MaterialTheme.typography.labelSmall,
            color = Forest,
            modifier = Modifier.padding(horizontal = 6.dp, vertical = 3.dp),
        )
    }
}

