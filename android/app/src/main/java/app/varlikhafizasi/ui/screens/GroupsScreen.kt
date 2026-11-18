package app.varlikhafizasi.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
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
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowForward
import androidx.compose.material.icons.outlined.Close
import androidx.compose.material.icons.outlined.Groups
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import app.varlikhafizasi.R
import app.varlikhafizasi.data.Group
import app.varlikhafizasi.data.MediaUrl
import app.varlikhafizasi.data.User
import app.varlikhafizasi.data.Plans
import app.varlikhafizasi.ui.VhViewModel
import app.varlikhafizasi.ui.components.BannerAd
import app.varlikhafizasi.ui.components.EmptyState
import app.varlikhafizasi.ui.components.ErrorBox
import app.varlikhafizasi.ui.components.LoadingBox
import app.varlikhafizasi.ui.components.Pill
import app.varlikhafizasi.ui.components.SectionLabel
import app.varlikhafizasi.ui.components.VhTopBar
import app.varlikhafizasi.ui.components.relativeDay
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
import app.varlikhafizasi.ui.theme.TerracottaInk
import app.varlikhafizasi.ui.theme.TerracottaPale
import app.varlikhafizasi.ui.theme.TerracottaSoft
import coil.compose.AsyncImage
import java.util.Locale

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun GroupsScreen(
    vm: VhViewModel,
    viewer: User,
    onOpenGroup: (String) -> Unit,
    onNewGroup: () -> Unit,
) {
    val state by vm.groups.collectAsStateWithLifecycle()
    var query by rememberSaveable { mutableStateOf("") }
    var selectedCategory by rememberSaveable { mutableStateOf<String?>(null) }

    LaunchedEffect(Unit) {
        if (state.data == null && !state.loading) vm.loadGroups()
    }

    val data = state.data
    val discoverAll = data?.discover.orEmpty()
    val categories = remember(discoverAll) {
        discoverAll.mapNotNull { it.category?.trim()?.takeIf(String::isNotEmpty) }
            .distinct()
            .sorted()
    }
    val filteredDiscover = remember(discoverAll, query, selectedCategory) {
        val needle = query.trim().lowercase(Locale.getDefault())
        discoverAll
            .filter { selectedCategory == null || it.category == selectedCategory }
            .filter { group ->
                needle.isEmpty() || listOfNotNull(group.name, group.description, group.category)
                    .any { it.lowercase(Locale.getDefault()).contains(needle) }
            }
            .sortedByDescending { it.lastActivityAt ?: "" }
    }
    val filtering = query.isNotBlank() || selectedCategory != null

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

        item {
            Surface(
                color = TerracottaPale,
                shape = RoundedCornerShape(16.dp),
                border = BorderStroke(1.dp, TerracottaSoft),
                modifier = Modifier
                    .padding(horizontal = 20.dp, vertical = 6.dp)
                    .fillMaxWidth()
                    .clickable { onNewGroup() },
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 14.dp, vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Box(
                        modifier = Modifier
                            .size(38.dp)
                            .background(Ivory, CircleShape),
                        contentAlignment = Alignment.Center,
                    ) {
                        Icon(
                            Icons.Outlined.Groups,
                            contentDescription = null,
                            tint = TerracottaInk,
                            modifier = Modifier.size(19.dp),
                        )
                    }
                    Spacer(Modifier.width(11.dp))
                    Column(Modifier.weight(1f)) {
                        Text(
                            stringResource(R.string.groups_new_action_title),
                            style = MaterialTheme.typography.titleMedium,
                            color = Forest,
                        )
                        Text(
                            stringResource(R.string.groups_new_action_body),
                            style = MaterialTheme.typography.bodySmall,
                            color = Muted,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                        )
                    }
                    Icon(
                        Icons.AutoMirrored.Outlined.ArrowForward,
                        contentDescription = null,
                        tint = TerracottaInk,
                        modifier = Modifier.size(18.dp),
                    )
                }
            }
        }

        if (!Plans.isPremium(viewer.plan)) {
            item { BannerAd() }
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

        if (discoverAll.isNotEmpty()) {
            item {
                OutlinedTextField(
                    value = query,
                    onValueChange = { query = it },
                    placeholder = {
                        Text(
                            stringResource(R.string.groups_search_placeholder),
                            color = Muted,
                        )
                    },
                    leadingIcon = {
                        Icon(Icons.Outlined.Search, contentDescription = null, tint = Muted)
                    },
                    trailingIcon = {
                        if (query.isNotEmpty()) {
                            IconButton(onClick = { query = "" }) {
                                Icon(
                                    Icons.Outlined.Close,
                                    contentDescription = stringResource(R.string.groups_search_clear),
                                    tint = Muted,
                                )
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
                    keyboardActions = KeyboardActions(onSearch = {}),
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 20.dp, vertical = 2.dp),
                )
            }
            if (categories.isNotEmpty()) {
                item {
                    FlowRow(
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                        verticalArrangement = Arrangement.spacedBy(6.dp),
                        modifier = Modifier.padding(horizontal = 20.dp, vertical = 6.dp),
                    ) {
                        Pill(
                            text = stringResource(R.string.groups_filter_all),
                            selected = selectedCategory == null,
                            onClick = { selectedCategory = null },
                        )
                        categories.forEach { category ->
                            Pill(
                                text = category,
                                selected = selectedCategory == category,
                                onClick = {
                                    selectedCategory = if (selectedCategory == category) null else category
                                },
                            )
                        }
                    }
                }
            }
        }

        if (data != null && discoverAll.isEmpty()) {
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
        } else if (filteredDiscover.isEmpty()) {
            item {
                Box(
                    Modifier
                        .padding(horizontal = 20.dp)
                        .fillMaxWidth()
                        .background(PaperDeep, RoundedCornerShape(18.dp)),
                ) {
                    EmptyState(
                        title = stringResource(R.string.groups_discover_no_match_title),
                        body = stringResource(R.string.groups_discover_no_match_body),
                        actionLabel = if (filtering) {
                            stringResource(R.string.groups_filter_all)
                        } else {
                            null
                        },
                        onAction = if (filtering) {
                            {
                                query = ""
                                selectedCategory = null
                            }
                        } else {
                            null
                        },
                    )
                }
            }
        } else {
            items(filteredDiscover, key = { "discover-${it.id}" }) { group ->
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
                val lastMovement = relativeDay(group.lastActivityAt)
                if (lastMovement != null) {
                    Spacer(Modifier.height(3.dp))
                    Text(
                        text = stringResource(R.string.asset_last_movement, lastMovement),
                        style = MaterialTheme.typography.labelSmall,
                        color = Muted,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
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

