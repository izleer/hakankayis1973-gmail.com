package app.varlikhafizasi.ui.local

import android.widget.Toast
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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.CloudUpload
import androidx.compose.material.icons.outlined.DataObject
import androidx.compose.material.icons.outlined.DeleteForever
import androidx.compose.material.icons.outlined.Description
import androidx.compose.material.icons.outlined.FolderZip
import androidx.compose.material.icons.outlined.Login
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import app.varlikhafizasi.R
import app.varlikhafizasi.ui.components.SectionLabel
import app.varlikhafizasi.ui.components.VhTopBar
import app.varlikhafizasi.ui.theme.Forest
import app.varlikhafizasi.ui.theme.Ivory
import app.varlikhafizasi.ui.theme.Muted
import app.varlikhafizasi.ui.theme.Paper
import app.varlikhafizasi.ui.theme.PaperDeep
import app.varlikhafizasi.ui.theme.TerracottaInk
import app.varlikhafizasi.ui.theme.TerracottaPale
import kotlinx.coroutines.launch

@Composable
fun LocalSettingsScreen(
    vm: LocalViewModel,
    onUpgrade: () -> Unit,
    onLogin: () -> Unit,
) {
    val state by vm.home.collectAsStateWithLifecycle()
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var exporting by remember { mutableStateOf<LocalExportKind?>(null) }
    var confirmDelete by rememberSaveable { mutableStateOf(false) }

    fun export(kind: LocalExportKind) {
        if (exporting != null) return
        exporting = kind
        scope.launch {
            val file = vm.export(kind)
            exporting = null
            if (file != null) {
                runCatching { shareLocalFile(context, file) }
                    .onFailure {
                        Toast.makeText(
                            context,
                            context.getString(R.string.local_export_error),
                            Toast.LENGTH_SHORT,
                        ).show()
                    }
            }
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Paper),
    ) {
        VhTopBar(title = stringResource(R.string.local_settings_title))

        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp, vertical = 8.dp),
        ) {
            SectionLabel(stringResource(R.string.local_storage_title))
            Surface(
                color = Ivory,
                shape = RoundedCornerShape(16.dp),
                modifier = Modifier.fillMaxWidth(),
            ) {
                Column(Modifier.padding(16.dp)) {
                    val counts = state.data?.counts
                    Text(
                        stringResource(
                            R.string.local_storage_body,
                            counts?.assets ?: 0,
                            counts?.entries ?: 0,
                            counts?.photos ?: 0,
                        ),
                        style = MaterialTheme.typography.bodyMedium,
                        color = Forest,
                    )
                    Spacer(Modifier.height(4.dp))
                    Text(
                        stringResource(R.string.local_footer),
                        style = MaterialTheme.typography.bodySmall,
                        color = Muted,
                    )
                    Spacer(Modifier.height(6.dp))
                    Text(
                        stringResource(R.string.local_plan_limits),
                        style = MaterialTheme.typography.bodySmall,
                        color = Muted,
                    )
                }
            }

            Spacer(Modifier.height(18.dp))
            SectionLabel(stringResource(R.string.local_export_title))
            Text(
                stringResource(R.string.local_export_body),
                style = MaterialTheme.typography.bodySmall,
                color = Muted,
                modifier = Modifier.padding(bottom = 8.dp),
            )
            ExportRow(
                icon = Icons.Outlined.FolderZip,
                title = stringResource(R.string.local_export_zip),
                body = stringResource(R.string.local_export_zip_desc),
                busy = exporting == LocalExportKind.ZIP,
                onClick = { export(LocalExportKind.ZIP) },
            )
            Spacer(Modifier.height(8.dp))
            ExportRow(
                icon = Icons.Outlined.DataObject,
                title = stringResource(R.string.local_export_json),
                body = stringResource(R.string.local_export_json_desc),
                busy = exporting == LocalExportKind.JSON,
                onClick = { export(LocalExportKind.JSON) },
            )
            Spacer(Modifier.height(8.dp))
            ExportRow(
                icon = Icons.Outlined.Description,
                title = stringResource(R.string.local_export_csv),
                body = stringResource(R.string.local_export_csv_desc),
                busy = exporting == LocalExportKind.CSV,
                onClick = { export(LocalExportKind.CSV) },
            )
            if (exporting != null) {
                Spacer(Modifier.height(8.dp))
                Text(
                    stringResource(R.string.local_export_preparing),
                    style = MaterialTheme.typography.labelSmall,
                    color = Muted,
                )
            }

            Spacer(Modifier.height(22.dp))
            SectionLabel(stringResource(R.string.local_cloud_title))
            Surface(
                color = TerracottaPale,
                shape = RoundedCornerShape(16.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { onUpgrade() },
            ) {
                Row(
                    modifier = Modifier.padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(
                        Icons.Outlined.CloudUpload,
                        contentDescription = null,
                        tint = TerracottaInk,
                        modifier = Modifier.size(22.dp),
                    )
                    Spacer(Modifier.size(10.dp))
                    Column(Modifier.weight(1f)) {
                        Text(
                            stringResource(R.string.local_cloud_cta),
                            style = MaterialTheme.typography.titleMedium,
                            color = TerracottaInk,
                        )
                        Text(
                            stringResource(R.string.local_cloud_body),
                            style = MaterialTheme.typography.bodySmall,
                            color = Muted,
                        )
                    }
                }
            }

            Spacer(Modifier.height(10.dp))
            Surface(
                color = Ivory,
                shape = RoundedCornerShape(16.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { onLogin() },
            ) {
                Row(
                    modifier = Modifier.padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(
                        Icons.Outlined.Login,
                        contentDescription = null,
                        tint = Forest,
                        modifier = Modifier.size(22.dp),
                    )
                    Spacer(Modifier.size(10.dp))
                    Column(Modifier.weight(1f)) {
                        Text(
                            stringResource(R.string.local_login_cta),
                            style = MaterialTheme.typography.titleMedium,
                            color = Forest,
                        )
                        Text(
                            stringResource(R.string.local_login_cta_body),
                            style = MaterialTheme.typography.bodySmall,
                            color = Muted,
                        )
                    }
                }
            }

            Spacer(Modifier.height(22.dp))
            SectionLabel(stringResource(R.string.local_data_title))
            Surface(
                color = PaperDeep,
                shape = RoundedCornerShape(16.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { confirmDelete = true },
            ) {
                Row(
                    modifier = Modifier.padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(
                        Icons.Outlined.DeleteForever,
                        contentDescription = null,
                        tint = TerracottaInk,
                        modifier = Modifier.size(22.dp),
                    )
                    Spacer(Modifier.size(10.dp))
                    Text(
                        stringResource(R.string.local_data_delete),
                        style = MaterialTheme.typography.titleSmall,
                        color = TerracottaInk,
                    )
                }
            }

            Spacer(Modifier.height(26.dp))
        }
    }

    if (confirmDelete) {
        AlertDialog(
            onDismissRequest = { confirmDelete = false },
            title = { Text(stringResource(R.string.local_data_delete)) },
            text = { Text(stringResource(R.string.local_data_delete_confirm)) },
            confirmButton = {
                TextButton(onClick = {
                    confirmDelete = false
                    vm.deleteAll { }
                }) {
                    Text(stringResource(R.string.local_delete), color = TerracottaInk)
                }
            },
            dismissButton = {
                TextButton(onClick = { confirmDelete = false }) {
                    Text(stringResource(R.string.local_cancel), color = Muted)
                }
            },
        )
    }
}

@Composable
private fun ExportRow(
    icon: ImageVector,
    title: String,
    body: String,
    busy: Boolean,
    onClick: () -> Unit,
) {
    Surface(
        color = Ivory,
        shape = RoundedCornerShape(14.dp),
        modifier = Modifier
            .fillMaxWidth()
            .clickable(enabled = !busy) { onClick() },
    ) {
        Row(
            modifier = Modifier.padding(14.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(
                modifier = Modifier.size(34.dp),
                contentAlignment = Alignment.Center,
            ) {
                if (busy) {
                    CircularProgressIndicator(
                        color = Forest,
                        strokeWidth = 2.dp,
                        modifier = Modifier.size(20.dp),
                    )
                } else {
                    Icon(icon, contentDescription = null, tint = Forest, modifier = Modifier.size(22.dp))
                }
            }
            Spacer(Modifier.size(10.dp))
            Column(Modifier.weight(1f)) {
                Text(title, style = MaterialTheme.typography.titleSmall, color = Forest)
                Text(body, style = MaterialTheme.typography.bodySmall, color = Muted)
            }
        }
    }
}
