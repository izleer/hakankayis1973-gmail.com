package app.varlikhafizasi.ui.local

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Add
import androidx.compose.material.icons.outlined.Close
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import app.varlikhafizasi.R
import app.varlikhafizasi.data.local.LocalLimits
import app.varlikhafizasi.ui.components.EmptyState
import app.varlikhafizasi.ui.components.LoadingBox
import app.varlikhafizasi.ui.components.VhTopBar
import app.varlikhafizasi.ui.theme.Forest
import app.varlikhafizasi.ui.theme.Line
import app.varlikhafizasi.ui.theme.Muted
import app.varlikhafizasi.ui.theme.Paper
import app.varlikhafizasi.ui.theme.PaperDeep
import app.varlikhafizasi.ui.theme.TerracottaInk
import app.varlikhafizasi.ui.theme.TerracottaPale

@Composable
fun LocalAssetsScreen(
    vm: LocalViewModel,
    onOpenAsset: (String) -> Unit,
    onNewAsset: () -> Unit,
    onUpgrade: () -> Unit,
) {
    val state by vm.home.collectAsStateWithLifecycle()
    var query by rememberSaveable { mutableStateOf("") }
    val keyboard = LocalSoftwareKeyboardController.current
    val assetLimitReached = (state.data?.counts?.assets ?: 0) >= LocalLimits.MAX_ASSETS

    val summaries = state.data?.summaries.orEmpty().filter { summary ->
        query.isBlank() ||
            summary.asset.title.contains(query, ignoreCase = true) ||
            summary.asset.category.contains(query, ignoreCase = true)
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Paper),
    ) {
        VhTopBar(
            title = stringResource(R.string.local_assets_title),
            subtitle = state.data?.let {
                pluralStringResource(R.plurals.local_assets_count, it.summaries.size, it.summaries.size)
            },
            actions = {
                IconButton(
                    onClick = {
                        if (assetLimitReached) vm.notifyAssetLimit() else onNewAsset()
                    },
                ) {
                    Icon(
                        Icons.Outlined.Add,
                        contentDescription = stringResource(R.string.local_new_asset),
                        tint = Forest,
                    )
                }
            },
        )

        OutlinedTextField(
            value = query,
            onValueChange = { query = it },
            placeholder = { Text(stringResource(R.string.local_assets_search), color = Muted) },
            leadingIcon = { Icon(Icons.Outlined.Search, contentDescription = null, tint = Muted) },
            trailingIcon = {
                if (query.isNotEmpty()) {
                    IconButton(onClick = { query = "" }) {
                        Icon(Icons.Outlined.Close, contentDescription = null, tint = Muted)
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
            keyboardActions = KeyboardActions(onSearch = { keyboard?.hide() }),
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp),
        )

        Spacer(Modifier.height(8.dp))
        LazyColumn(
            contentPadding = PaddingValues(horizontal = 20.dp, vertical = 10.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
            modifier = Modifier.fillMaxSize(),
        ) {
            if (state.loading && state.data == null) {
                item { LoadingBox() }
            }
            if (assetLimitReached) {
                item {
                    Surface(
                        color = TerracottaPale,
                        shape = RoundedCornerShape(16.dp),
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { onUpgrade() },
                    ) {
                        Column(Modifier.padding(14.dp)) {
                            Text(
                                stringResource(R.string.local_limit_assets_body),
                                style = MaterialTheme.typography.bodySmall,
                                color = TerracottaInk,
                            )
                            Spacer(Modifier.height(6.dp))
                            Text(
                                stringResource(R.string.local_upgrade_cta),
                                style = MaterialTheme.typography.labelMedium,
                                color = Forest,
                            )
                        }
                    }
                }
            }
            if (summaries.isEmpty() && state.data != null) {
                item {
                    Box(
                        Modifier
                            .fillMaxWidth()
                            .background(PaperDeep, RoundedCornerShape(18.dp))
                            .padding(4.dp),
                    ) {
                        EmptyState(
                            title = stringResource(R.string.local_empty_title),
                            body = stringResource(R.string.local_assets_empty),
                            actionLabel = if (query.isBlank()) {
                                stringResource(R.string.local_new_asset)
                            } else {
                                null
                            },
                            onAction = if (query.isBlank()) onNewAsset else null,
                        )
                    }
                }
            }
            items(summaries, key = { it.asset.id }) { summary ->
                LocalAssetRow(
                    summary = summary,
                    coverFile = vm.mediaFile(summary.asset.coverPath),
                    onClick = { onOpenAsset(summary.asset.id) },
                )
            }
            item {
                Text(
                    stringResource(R.string.local_footer),
                    style = MaterialTheme.typography.bodySmall,
                    color = Muted,
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 18.dp),
                )
            }
        }
    }
}
