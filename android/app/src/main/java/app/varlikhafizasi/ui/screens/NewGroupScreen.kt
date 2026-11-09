package app.varlikhafizasi.ui.screens

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.annotation.StringRes
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.AddPhotoAlternate
import androidx.compose.material.icons.outlined.ArrowDropDown
import androidx.compose.material.icons.outlined.CheckCircle
import androidx.compose.material.icons.outlined.PersonAddAlt
import androidx.compose.material.icons.outlined.PhotoCamera
import androidx.compose.material.icons.outlined.PhotoLibrary
import androidx.compose.material.icons.outlined.RadioButtonUnchecked
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.Saver
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import app.varlikhafizasi.R
import app.varlikhafizasi.ui.VhViewModel
import app.varlikhafizasi.ui.components.Avatar
import app.varlikhafizasi.ui.components.GoldRule
import app.varlikhafizasi.ui.components.Pill
import app.varlikhafizasi.ui.components.SectionLabel
import app.varlikhafizasi.ui.components.VhTopBar
import app.varlikhafizasi.ui.theme.Clay
import app.varlikhafizasi.ui.theme.Danger
import app.varlikhafizasi.ui.theme.Forest
import app.varlikhafizasi.ui.theme.Ivory
import app.varlikhafizasi.ui.theme.Line
import app.varlikhafizasi.ui.theme.Muted
import app.varlikhafizasi.ui.theme.Paper
import app.varlikhafizasi.ui.theme.PaperDeep
import app.varlikhafizasi.ui.theme.SageInk
import app.varlikhafizasi.ui.theme.TerracottaInk
import app.varlikhafizasi.ui.theme.TerracottaSoft
import coil.compose.AsyncImage

private data class GroupCategory(val value: String, @StringRes val label: Int)

// Sunucuya web ile aynı temel kategori adları gönderilir; etiketler dile göre gösterilir.
private val groupCategories = listOf(
    GroupCategory("Bitkiler", R.string.groups_category_plants),
    GroupCategory("Klasik araçlar", R.string.groups_category_classic_cars),
    GroupCategory("Ev & mekân", R.string.groups_category_home),
    GroupCategory("Evcil hayvanlar", R.string.groups_category_pets),
    GroupCategory("Sanat & koleksiyon", R.string.groups_category_art),
    GroupCategory("Bisiklet", R.string.groups_category_bikes),
    GroupCategory("El işi", R.string.groups_category_craft),
    GroupCategory("Diğer", R.string.groups_category_other),
)

private val GroupCoverUriSaver = Saver<Uri?, String>(
    save = { it?.toString().orEmpty() },
    restore = { value -> value.takeIf { it.isNotEmpty() }?.let(Uri::parse) },
)

private val InviteIdsSaver = Saver<List<String>, String>(
    save = { ids -> ids.joinToString(",") },
    restore = { value -> value.split(",").filter { it.isNotBlank() } },
)

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun NewGroupScreen(
    vm: VhViewModel,
    onBack: () -> Unit,
    onCreated: (String) -> Unit,
) {
    val busy by vm.formBusy.collectAsStateWithLifecycle()
    val error by vm.formError.collectAsStateWithLifecycle()
    val pickerFriends by vm.pickerFriends.collectAsStateWithLifecycle()

    var name by rememberSaveable { mutableStateOf("") }
    var description by rememberSaveable { mutableStateOf("") }
    var categoryIndex by rememberSaveable { mutableIntStateOf(0) }
    var visibility by rememberSaveable { mutableStateOf("public") }
    var joinPolicy by rememberSaveable { mutableStateOf("open") }
    var rules by rememberSaveable { mutableStateOf("") }
    var coverUri by rememberSaveable(stateSaver = GroupCoverUriSaver) { mutableStateOf<Uri?>(null) }
    var pendingCoverUri by rememberSaveable(stateSaver = GroupCoverUriSaver) { mutableStateOf<Uri?>(null) }
    var categoryOpen by rememberSaveable { mutableStateOf(false) }
    var inviteOpen by rememberSaveable { mutableStateOf(false) }
    var inviteIds by rememberSaveable(stateSaver = InviteIdsSaver) {
        mutableStateOf(emptyList<String>())
    }

    val context = LocalContext.current
    val cameraUnavailable = stringResource(R.string.media_camera_unavailable)

    LaunchedEffect(Unit) {
        vm.clearFormError()
    }

    LaunchedEffect(inviteOpen) {
        if (inviteOpen) vm.loadPickerFriends()
    }

    val picker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        if (uri != null) coverUri = uri
    }

    val camera = rememberLauncherForActivityResult(ActivityResultContracts.TakePicture()) { saved ->
        val captured = pendingCoverUri
        pendingCoverUri = null
        if (saved && captured != null) coverUri = captured
    }

    fun captureCover() {
        val target = runCatching { createCaptureUri(context, "group-cover") }.getOrElse {
            vm.setNotice(cameraUnavailable)
            return
        }
        pendingCoverUri = target
        runCatching { camera.launch(target) }.onFailure {
            pendingCoverUri = null
            vm.setNotice(cameraUnavailable)
        }
    }

    fun submit() {
        vm.createGroup(
            name = name,
            description = description,
            category = groupCategories[categoryIndex].value,
            rules = rules,
            visibility = visibility,
            joinPolicy = joinPolicy,
            coverUri = coverUri,
            inviteUsernames = pickerFriends.data.orEmpty()
                .filter { it.id in inviteIds }
                .map { it.username },
            onCreated = { group -> onCreated(group.slug) },
        )
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Paper),
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .imePadding(),
        ) {
            VhTopBar(
                title = stringResource(R.string.groups_new_title),
                onBack = onBack,
            )

            Column(Modifier.padding(horizontal = 20.dp)) {
                Text(
                    stringResource(R.string.groups_new_kicker),
                    style = MaterialTheme.typography.labelSmall,
                    color = Clay,
                )
                Spacer(Modifier.height(4.dp))
                Text(
                    stringResource(R.string.groups_new_headline),
                    style = MaterialTheme.typography.displayMedium,
                    color = Forest,
                )
                Spacer(Modifier.height(12.dp))
                GoldRule()
                Spacer(Modifier.height(12.dp))
                Text(
                    stringResource(R.string.groups_new_intro),
                    style = MaterialTheme.typography.bodyMedium,
                    color = Muted,
                )

                Spacer(Modifier.height(20.dp))
                OutlinedTextField(
                    value = name,
                    onValueChange = {
                        name = it.take(80)
                        if (error != null) vm.clearFormError()
                    },
                    label = { Text(stringResource(R.string.groups_name_label)) },
                    placeholder = { Text(stringResource(R.string.groups_name_placeholder)) },
                    singleLine = true,
                    enabled = !busy,
                    modifier = Modifier.fillMaxWidth(),
                )

                Spacer(Modifier.height(12.dp))
                OutlinedTextField(
                    value = description,
                    onValueChange = { description = it.take(1000) },
                    label = { Text(stringResource(R.string.groups_description_label)) },
                    placeholder = { Text(stringResource(R.string.groups_description_placeholder)) },
                    minLines = 3,
                    enabled = !busy,
                    modifier = Modifier.fillMaxWidth(),
                )

                Spacer(Modifier.height(16.dp))
                SectionLabel(stringResource(R.string.groups_category_label))
                Box {
                    OutlinedButton(
                        onClick = { categoryOpen = true },
                        enabled = !busy,
                        shape = RoundedCornerShape(12.dp),
                        border = BorderStroke(1.dp, Line),
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Text(
                            stringResource(groupCategories[categoryIndex].label),
                            color = Forest,
                            style = MaterialTheme.typography.bodyMedium,
                            modifier = Modifier.weight(1f),
                        )
                        Icon(Icons.Outlined.ArrowDropDown, contentDescription = null, tint = Muted)
                    }
                    DropdownMenu(
                        expanded = categoryOpen,
                        onDismissRequest = { categoryOpen = false },
                        modifier = Modifier.background(Ivory),
                    ) {
                        groupCategories.forEachIndexed { index, category ->
                            DropdownMenuItem(
                                text = { Text(stringResource(category.label), color = Forest) },
                                onClick = {
                                    categoryIndex = index
                                    categoryOpen = false
                                },
                            )
                        }
                    }
                }

                Spacer(Modifier.height(20.dp))
                SectionLabel(stringResource(R.string.groups_access_label))
                FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Pill(
                        stringResource(R.string.groups_visibility_public),
                        visibility == "public",
                        onClick = { visibility = "public" },
                    )
                    Pill(
                        stringResource(R.string.groups_visibility_private_long),
                        visibility == "private",
                        onClick = { visibility = "private" },
                    )
                }
                Spacer(Modifier.height(6.dp))
                Text(
                    stringResource(
                        if (visibility == "private") {
                            R.string.groups_visibility_private_hint
                        } else {
                            R.string.groups_visibility_public_hint
                        },
                    ),
                    style = MaterialTheme.typography.bodySmall,
                    color = Muted,
                )

                Spacer(Modifier.height(18.dp))
                SectionLabel(stringResource(R.string.groups_join_label))
                if (visibility == "private") {
                    Text(
                        stringResource(R.string.groups_join_locked_hint),
                        style = MaterialTheme.typography.bodySmall,
                        color = Muted,
                    )
                } else {
                    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Pill(
                            stringResource(R.string.groups_join_open),
                            joinPolicy == "open",
                            onClick = { joinPolicy = "open" },
                        )
                        Pill(
                            stringResource(R.string.groups_join_approval),
                            joinPolicy == "approval",
                            onClick = { joinPolicy = "approval" },
                        )
                    }
                }

                Spacer(Modifier.height(20.dp))
                SectionLabel(stringResource(R.string.groups_invite_label))
                Spacer(Modifier.height(6.dp))
                Text(
                    stringResource(R.string.groups_invite_body),
                    style = MaterialTheme.typography.bodySmall,
                    color = Muted,
                )
                Spacer(Modifier.height(10.dp))
                OutlinedButton(
                    onClick = { inviteOpen = !inviteOpen },
                    enabled = !busy,
                    shape = RoundedCornerShape(12.dp),
                    border = BorderStroke(
                        1.dp,
                        if (inviteIds.isEmpty()) Line else TerracottaSoft,
                    ),
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Icon(
                        Icons.Outlined.PersonAddAlt,
                        contentDescription = null,
                        tint = TerracottaInk,
                        modifier = Modifier.size(18.dp),
                    )
                    Spacer(Modifier.size(8.dp))
                    Text(
                        stringResource(
                            if (inviteOpen) {
                                R.string.groups_invite_hide
                            } else {
                                R.string.groups_invite_button
                            },
                        ),
                        style = MaterialTheme.typography.labelMedium,
                        color = Forest,
                        modifier = Modifier.weight(1f),
                    )
                    if (inviteIds.isNotEmpty()) {
                        Text(
                            stringResource(R.string.groups_invite_count, inviteIds.size),
                            style = MaterialTheme.typography.labelSmall,
                            color = TerracottaInk,
                        )
                    }
                }
                if (inviteOpen) {
                    Spacer(Modifier.height(8.dp))
                    Surface(
                        color = PaperDeep,
                        shape = RoundedCornerShape(16.dp),
                        border = BorderStroke(1.dp, Line),
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Column(Modifier.padding(horizontal = 12.dp, vertical = 10.dp)) {
                            val friends = pickerFriends.data.orEmpty()
                            when {
                                friends.isEmpty() && pickerFriends.loading -> Text(
                                    stringResource(R.string.groups_invite_loading),
                                    style = MaterialTheme.typography.bodySmall,
                                    color = Muted,
                                )

                                friends.isEmpty() && pickerFriends.error != null -> Column {
                                    Text(
                                        pickerFriends.error ?: "",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = Danger,
                                    )
                                    TextButton(onClick = { vm.loadPickerFriends() }) {
                                        Text(
                                            stringResource(R.string.common_retry),
                                            color = Forest,
                                        )
                                    }
                                }

                                friends.isEmpty() -> Text(
                                    stringResource(R.string.groups_invite_empty),
                                    style = MaterialTheme.typography.bodySmall,
                                    color = Muted,
                                )

                                else -> Column(
                                    verticalArrangement = Arrangement.spacedBy(2.dp),
                                ) {
                                    friends.forEach { friend ->
                                        val selected = friend.id in inviteIds
                                        Row(
                                            verticalAlignment = Alignment.CenterVertically,
                                            modifier = Modifier
                                                .fillMaxWidth()
                                                .clip(RoundedCornerShape(10.dp))
                                                .clickable(enabled = !busy) {
                                                    inviteIds = if (selected) {
                                                        inviteIds - friend.id
                                                    } else {
                                                        inviteIds + friend.id
                                                    }
                                                }
                                                .padding(horizontal = 4.dp, vertical = 7.dp),
                                        ) {
                                            Avatar(
                                                friend.displayName,
                                                friend.avatarUrl,
                                                size = 34.dp,
                                            )
                                            Spacer(Modifier.size(10.dp))
                                            Column(Modifier.weight(1f)) {
                                                Text(
                                                    friend.displayName,
                                                    style = MaterialTheme.typography.bodyMedium,
                                                    color = Forest,
                                                    maxLines = 1,
                                                    overflow = TextOverflow.Ellipsis,
                                                )
                                                Text(
                                                    "@${friend.username}",
                                                    style = MaterialTheme.typography.bodySmall,
                                                    color = Muted,
                                                    maxLines = 1,
                                                    overflow = TextOverflow.Ellipsis,
                                                )
                                            }
                                            Icon(
                                                if (selected) {
                                                    Icons.Outlined.CheckCircle
                                                } else {
                                                    Icons.Outlined.RadioButtonUnchecked
                                                },
                                                contentDescription = null,
                                                tint = if (selected) TerracottaInk else Line,
                                                modifier = Modifier.size(22.dp),
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                Spacer(Modifier.height(20.dp))
                SectionLabel(stringResource(R.string.groups_rules_title))
                Spacer(Modifier.height(6.dp))
                OutlinedTextField(
                    value = rules,
                    onValueChange = { rules = it.take(2000) },
                    placeholder = { Text(stringResource(R.string.groups_rules_placeholder)) },
                    minLines = 4,
                    enabled = !busy,
                    modifier = Modifier.fillMaxWidth(),
                )

                Spacer(Modifier.height(20.dp))
                SectionLabel(stringResource(R.string.groups_cover_label))
                Surface(
                    color = PaperDeep,
                    shape = RoundedCornerShape(16.dp),
                    border = BorderStroke(1.dp, Line),
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(180.dp)
                        .clickable(enabled = !busy) { picker.launch("image/*") },
                ) {
                    if (coverUri != null) {
                        Box(Modifier.fillMaxSize()) {
                            AsyncImage(
                                model = coverUri,
                                contentDescription = stringResource(R.string.groups_cover_label),
                                contentScale = ContentScale.Crop,
                                modifier = Modifier.fillMaxSize(),
                            )
                            Text(
                                stringResource(R.string.groups_cover_change),
                                style = MaterialTheme.typography.labelSmall,
                                color = Color.White,
                                modifier = Modifier
                                    .align(Alignment.BottomEnd)
                                    .background(Forest.copy(alpha = 0.75f), RoundedCornerShape(4.dp))
                                    .padding(horizontal = 8.dp, vertical = 5.dp),
                            )
                        }
                    } else {
                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.Center,
                            modifier = Modifier.fillMaxSize(),
                        ) {
                            Icon(
                                Icons.Outlined.AddPhotoAlternate,
                                contentDescription = null,
                                tint = SageInk,
                            )
                            Spacer(Modifier.height(6.dp))
                            Text(
                                stringResource(R.string.groups_cover_pick),
                                style = MaterialTheme.typography.bodySmall,
                                color = Muted,
                            )
                        }
                    }
                }

                Spacer(Modifier.height(8.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedButton(
                        onClick = { picker.launch("image/*") },
                        enabled = !busy,
                        shape = RoundedCornerShape(12.dp),
                        border = BorderStroke(1.dp, Line),
                        modifier = Modifier.weight(1f),
                    ) {
                        Icon(
                            Icons.Outlined.PhotoLibrary,
                            contentDescription = null,
                            tint = Forest,
                            modifier = Modifier.size(18.dp),
                        )
                        Spacer(Modifier.size(6.dp))
                        Text(
                            stringResource(R.string.groups_cover_pick),
                            style = MaterialTheme.typography.labelMedium,
                            color = Forest,
                        )
                    }
                    OutlinedButton(
                        onClick = { captureCover() },
                        enabled = !busy,
                        shape = RoundedCornerShape(12.dp),
                        border = BorderStroke(1.dp, Line),
                        modifier = Modifier.weight(1f),
                    ) {
                        Icon(
                            Icons.Outlined.PhotoCamera,
                            contentDescription = null,
                            tint = Forest,
                            modifier = Modifier.size(18.dp),
                        )
                        Spacer(Modifier.size(6.dp))
                        Text(
                            stringResource(R.string.media_take_photo),
                            style = MaterialTheme.typography.labelMedium,
                            color = Forest,
                        )
                    }
                }

                Spacer(Modifier.height(104.dp))
            }
        }

        Surface(
            color = Paper,
            shadowElevation = 12.dp,
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .fillMaxWidth(),
        ) {
            Column(Modifier.padding(horizontal = 20.dp, vertical = 12.dp)) {
                if (error != null) {
                    Text(
                        error ?: "",
                        style = MaterialTheme.typography.bodySmall,
                        color = Danger,
                        modifier = Modifier.padding(bottom = 8.dp),
                    )
                }
                Button(
                    onClick = { submit() },
                    enabled = !busy,
                    colors = ButtonDefaults.buttonColors(
                        containerColor = Forest,
                        contentColor = Paper,
                    ),
                    shape = RoundedCornerShape(50),
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(52.dp),
                ) {
                    if (busy) {
                        CircularProgressIndicator(
                            color = Paper,
                            strokeWidth = 2.dp,
                            modifier = Modifier.size(20.dp),
                        )
                    } else {
                        Text(
                            stringResource(
                                if (inviteIds.isEmpty()) {
                                    R.string.groups_submit
                                } else {
                                    R.string.groups_submit_invites
                                },
                            ),
                            style = MaterialTheme.typography.labelLarge,
                        )
                    }
                }
            }
        }
    }
}
