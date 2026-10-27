package app.varlikhafizasi.ui.screens

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
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
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
import androidx.compose.material3.Text
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import app.varlikhafizasi.ui.VhViewModel
import app.varlikhafizasi.ui.components.AssetRow
import app.varlikhafizasi.ui.components.EmptyState
import app.varlikhafizasi.ui.components.ErrorBox
import app.varlikhafizasi.ui.components.LoadingBox
import app.varlikhafizasi.ui.components.SectionLabel
import app.varlikhafizasi.ui.components.VhTopBar
import app.varlikhafizasi.ui.theme.Forest
import app.varlikhafizasi.ui.theme.Line
import app.varlikhafizasi.ui.theme.Muted
import app.varlikhafizasi.ui.theme.Paper
import app.varlikhafizasi.ui.theme.PaperDeep

@Composable
fun AssetsScreen(
    vm: VhViewModel,
    onOpenAsset: (String) -> Unit,
    onNewAsset: () -> Unit,
) {
    val state by vm.assets.collectAsStateWithLifecycle()
    var query by rememberSaveable { mutableStateOf("") }

    LaunchedEffect(Unit) {
        if (state.data == null && !state.loading) vm.loadAssets()
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Paper),
    ) {
        VhTopBar(
            title = "Varlıklar",
            subtitle = state.data?.let { "${it.size} varlık hafızanda" },
            actions = {
                IconButton(onClick = onNewAsset) {
                    Icon(Icons.Outlined.Add, contentDescription = "Yeni varlık", tint = Forest)
                }
            },
        )

        OutlinedTextField(
            value = query,
            onValueChange = { query = it },
            placeholder = { Text("Ad veya açıklamada ara", color = Muted) },
            leadingIcon = {
                Icon(Icons.Outlined.Search, contentDescription = null, tint = Muted)
            },
            trailingIcon = {
                if (query.isNotEmpty()) {
                    IconButton(onClick = {
                        query = ""
                        vm.loadAssets()
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
            keyboardActions = KeyboardActions(onSearch = { vm.loadAssets(query) }),
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
            if (state.error != null) {
                item { ErrorBox(state.error ?: "", onRetry = { vm.loadAssets(query) }) }
            }
            if (state.data != null && state.data!!.isEmpty()) {
                item {
                    Box(
                        Modifier
                            .fillMaxWidth()
                            .background(PaperDeep, RoundedCornerShape(18.dp))
                            .padding(4.dp),
                    ) {
                        EmptyState(
                            title = if (query.isBlank()) "Hafıza henüz boş" else "Eşleşen varlık yok",
                            body = if (query.isBlank()) {
                                "İlk varlığını ekle; fotoğrafları, belgeleri ve bakım notlarıyla birlikte yaşasın."
                            } else {
                                "Farklı bir kelimeyle aramayı deneyin."
                            },
                            actionLabel = if (query.isBlank()) "Yeni varlık" else null,
                            onAction = if (query.isBlank()) onNewAsset else null,
                        )
                    }
                }
            }

            if (state.data.orEmpty().isNotEmpty()) {
                item { SectionLabel("Arşivindeki varlıklar") }
            }
            items(state.data.orEmpty(), key = { it.id }) { asset ->
                AssetRow(asset = asset, onClick = { onOpenAsset(asset.id) })
            }
            item {
                Text(
                    text = "Her varlık, kendi hikâyesinin kapısıdır.",
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
