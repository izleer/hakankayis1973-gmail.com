package app.varlikhafizasi.ui.local

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
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Alarm
import androidx.compose.material.icons.outlined.Check
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import app.varlikhafizasi.R
import app.varlikhafizasi.data.local.LocalReminder
import app.varlikhafizasi.ui.components.EmptyState
import app.varlikhafizasi.ui.components.SectionLabel
import app.varlikhafizasi.ui.components.VhTopBar
import app.varlikhafizasi.ui.theme.Forest
import app.varlikhafizasi.ui.theme.Ivory
import app.varlikhafizasi.ui.theme.Muted
import app.varlikhafizasi.ui.theme.Paper
import app.varlikhafizasi.ui.theme.PaperDeep
import app.varlikhafizasi.ui.theme.TerracottaInk
import app.varlikhafizasi.ui.theme.TerracottaPale

@Composable
fun LocalRemindersScreen(
    vm: LocalViewModel,
    onOpenAsset: (String) -> Unit,
) {
    val state by vm.home.collectAsStateWithLifecycle()
    val reminders = state.data?.reminders.orEmpty()
    val open = reminders.filter { !it.done }
    val done = reminders.filter { it.done }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Paper),
    ) {
        VhTopBar(title = stringResource(R.string.local_reminders_title))

        LazyColumn(
            contentPadding = PaddingValues(horizontal = 20.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
            modifier = Modifier.fillMaxSize(),
        ) {
            if (reminders.isEmpty()) {
                item {
                    Box(
                        Modifier
                            .fillMaxWidth()
                            .background(PaperDeep, RoundedCornerShape(18.dp))
                            .padding(4.dp),
                    ) {
                        EmptyState(
                            title = stringResource(R.string.local_reminders_none_title),
                            body = stringResource(R.string.local_reminders_none_body),
                        )
                    }
                }
            }
            if (open.isNotEmpty()) {
                item { SectionLabel(stringResource(R.string.local_reminders_upcoming)) }
                items(open, key = { "open-${it.entryId}" }) { reminder ->
                    ReminderCard(
                        reminder = reminder,
                        onOpen = { onOpenAsset(reminder.assetId) },
                        onToggle = { vm.setReminderDone(reminder.entryId, true) },
                    )
                }
            }
            if (done.isNotEmpty()) {
                item { SectionLabel(stringResource(R.string.local_reminders_done)) }
                items(done, key = { "done-${it.entryId}" }) { reminder ->
                    ReminderCard(
                        reminder = reminder,
                        onOpen = { onOpenAsset(reminder.assetId) },
                        onToggle = { vm.setReminderDone(reminder.entryId, false) },
                    )
                }
            }
            item {
                Text(
                    stringResource(R.string.local_footer),
                    style = MaterialTheme.typography.bodySmall,
                    color = Muted,
                    modifier = Modifier.padding(vertical = 16.dp),
                )
            }
        }
    }
}

@Composable
private fun ReminderCard(
    reminder: LocalReminder,
    onOpen: () -> Unit,
    onToggle: () -> Unit,
) {
    Surface(
        color = if (reminder.done) PaperDeep else Ivory,
        shape = RoundedCornerShape(15.dp),
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onOpen() },
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 14.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(
                modifier = Modifier
                    .size(36.dp)
                    .clip(CircleShape)
                    .background(if (reminder.done) Paper else TerracottaPale),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    if (reminder.done) Icons.Outlined.Check else Icons.Outlined.Alarm,
                    contentDescription = null,
                    tint = if (reminder.done) Muted else TerracottaInk,
                    modifier = Modifier.size(19.dp),
                )
            }
            Spacer(Modifier.size(10.dp))
            Column(Modifier.weight(1f)) {
                Text(
                    reminder.title?.takeIf { it.isNotBlank() } ?: reminder.assetTitle,
                    style = MaterialTheme.typography.titleSmall,
                    color = if (reminder.done) Muted else Forest,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                Text(
                    "${reminder.assetTitle} · ${formatLocalDate(reminder.dueAt, withTime = true)}",
                    style = MaterialTheme.typography.bodySmall,
                    color = Muted,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
            IconButton(onClick = onToggle) {
                Icon(
                    Icons.Outlined.Check,
                    contentDescription = stringResource(
                        if (reminder.done) R.string.local_reminders_reopen
                        else R.string.local_reminders_mark_done,
                    ),
                    tint = if (reminder.done) Muted else Forest,
                )
            }
        }
    }
}
