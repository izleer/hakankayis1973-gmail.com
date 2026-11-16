package app.varlikhafizasi.ui.screens

import androidx.compose.foundation.background
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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.CheckCircle
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import app.varlikhafizasi.R
import app.varlikhafizasi.data.PlanWarning
import app.varlikhafizasi.data.Plans
import app.varlikhafizasi.ui.VhViewModel
import app.varlikhafizasi.ui.components.GoldRule
import app.varlikhafizasi.ui.components.VhTopBar
import app.varlikhafizasi.ui.components.formatBytes
import app.varlikhafizasi.ui.components.formatDate
import app.varlikhafizasi.ui.theme.Clay
import app.varlikhafizasi.ui.theme.Danger
import app.varlikhafizasi.ui.theme.Forest
import app.varlikhafizasi.ui.theme.Ivory
import app.varlikhafizasi.ui.theme.Line
import app.varlikhafizasi.ui.theme.Muted
import app.varlikhafizasi.ui.theme.Paper
import app.varlikhafizasi.ui.theme.Sage
import app.varlikhafizasi.ui.theme.SageInk
import app.varlikhafizasi.ui.theme.SageLight
import app.varlikhafizasi.ui.theme.TerracottaPale
import androidx.compose.foundation.BorderStroke

/** Bulut planlarının mobil karşılığı: mevcut plan, kullanım ve karşılaştırma. */
@Composable
fun PlanScreen(
    vm: VhViewModel,
    onBack: () -> Unit,
) {
    val state by vm.plan.collectAsStateWithLifecycle()
    val busy by vm.planBusy.collectAsStateWithLifecycle()
    val error by vm.planError.collectAsStateWithLifecycle()
    val session by vm.session.collectAsStateWithLifecycle()

    val plan = Plans.normalize(state.data?.plan ?: session.user?.plan)
    val premium = Plans.isPremium(plan)
    val usage = state.data?.usage?.assets ?: 0
    val storageUsed = state.data?.usage?.storageBytes ?: 0L
    val storageLimit = state.data?.limits?.maxStorageBytes
    val storageText = if (storageLimit != null) {
        "${formatBytes(storageUsed)} / ${formatBytes(storageLimit)}"
    } else {
        "${formatBytes(storageUsed)} · ${stringResource(R.string.plan_unlimited)}"
    }
    val warnings = state.data?.warnings.orEmpty()

    LaunchedEffect(Unit) {
        vm.clearPlanError()
        vm.loadPlan(force = true)
    }

    val rows = planRows()
    val maxAssets = Plans.maxAssets(plan)
    val maxMedia = Plans.maxMedia(plan)

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Paper),
    ) {
        VhTopBar(
            title = stringResource(R.string.plan_title),
            onBack = onBack,
        )

        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(
                start = 20.dp,
                end = 20.dp,
                top = 8.dp,
                bottom = 28.dp,
            ),
        ) {
            item {
                Text(
                    stringResource(R.string.plan_eyebrow),
                    style = MaterialTheme.typography.labelSmall,
                    color = Clay,
                )
                Spacer(Modifier.height(4.dp))
                Text(
                    stringResource(R.string.plan_title),
                    style = MaterialTheme.typography.headlineLarge,
                    color = Forest,
                )
                Spacer(Modifier.height(8.dp))
                Text(
                    stringResource(R.string.plan_intro),
                    style = MaterialTheme.typography.bodySmall,
                    color = Muted,
                )
                Spacer(Modifier.height(16.dp))
            }

            item {
                Surface(
                    color = Forest,
                    shape = RoundedCornerShape(22.dp),
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Column(Modifier.padding(18.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Surface(
                                color = if (premium) Clay else Sage,
                                shape = RoundedCornerShape(50),
                            ) {
                                Text(
                                    stringResource(
                                        if (premium) {
                                            R.string.plan_badge_premium
                                        } else {
                                            R.string.plan_badge_free
                                        },
                                    ),
                                    style = MaterialTheme.typography.labelSmall,
                                    color = if (premium) Paper else Forest,
                                    fontWeight = FontWeight.SemiBold,
                                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                                )
                            }
                            Spacer(Modifier.width(10.dp))
                            Text(
                                stringResource(R.string.plan_current),
                                style = MaterialTheme.typography.labelSmall,
                                color = Paper.copy(alpha = 0.6f),
                            )
                        }
                        Spacer(Modifier.height(10.dp))
                        Text(
                            stringResource(
                                if (premium) R.string.plan_premium_name else R.string.plan_free_name,
                            ),
                            style = MaterialTheme.typography.headlineSmall,
                            color = Paper,
                        )
                        Text(
                            stringResource(
                                if (premium) {
                                    R.string.plan_premium_desc
                                } else {
                                    R.string.plan_free_desc
                                },
                            ),
                            style = MaterialTheme.typography.bodySmall,
                            color = Paper.copy(alpha = 0.78f),
                        )
                        Spacer(Modifier.height(12.dp))
                        GoldRule()
                        Spacer(Modifier.height(12.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            PlanStatBox(
                                label = stringResource(R.string.plan_usage_assets),
                                value = if (maxAssets != null) {
                                    stringResource(R.string.plan_usage_value, usage, maxAssets)
                                } else {
                                    "$usage · ${stringResource(R.string.plan_unlimited)}"
                                },
                                modifier = Modifier.weight(1f),
                            )
                            PlanStatBox(
                                label = stringResource(R.string.plan_usage_media),
                                value = "$maxMedia",
                                modifier = Modifier.weight(1f),
                            )
                            PlanStatBox(
                                label = stringResource(R.string.plan_usage_since),
                                value = formatDate(state.data?.startedAt)
                                    .ifBlank { stringResource(R.string.plan_since_new) },
                                modifier = Modifier.weight(1.1f),
                            )
                        }
                        Spacer(Modifier.height(8.dp))
                        PlanStatBox(
                            label = stringResource(R.string.plan_row_storage),
                            value = storageText,
                            modifier = Modifier.fillMaxWidth(),
                        )
                    }
                }
                Spacer(Modifier.height(12.dp))
            }

            if (warnings.isNotEmpty()) {
                item {
                    warnings.forEach { warning ->
                        PlanWarningRow(warning)
                        Spacer(Modifier.height(6.dp))
                    }
                    Spacer(Modifier.height(6.dp))
                }
            }

            item {
                Button(
                    onClick = { vm.updatePlan(if (premium) Plans.FREE else Plans.PREMIUM) },
                    enabled = !busy,
                    colors = ButtonDefaults.buttonColors(
                        containerColor = Forest,
                        contentColor = Paper,
                    ),
                    shape = RoundedCornerShape(50),
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(50.dp),
                ) {
                    if (busy) {
                        CircularProgressIndicator(
                            color = Paper,
                            strokeWidth = 2.dp,
                            modifier = Modifier.size(18.dp),
                        )
                    } else {
                        Text(
                            stringResource(
                                if (premium) {
                                    R.string.plan_downgrade_cta
                                } else {
                                    R.string.plan_upgrade_cta
                                },
                            ),
                            fontWeight = FontWeight.SemiBold,
                        )
                    }
                }
                Spacer(Modifier.height(8.dp))
                Text(
                    stringResource(R.string.plan_billing_note),
                    style = MaterialTheme.typography.bodySmall,
                    color = Muted,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.fillMaxWidth(),
                )
                if (error != null) {
                    Spacer(Modifier.height(8.dp))
                    Text(
                        error ?: "",
                        style = MaterialTheme.typography.bodySmall,
                        color = Danger,
                    )
                }
                Spacer(Modifier.height(18.dp))
            }

            item {
                Text(
                    stringResource(R.string.plan_matrix_title),
                    style = MaterialTheme.typography.titleMedium,
                    color = Forest,
                )
                Text(
                    stringResource(R.string.plan_matrix_subtitle),
                    style = MaterialTheme.typography.bodySmall,
                    color = Muted,
                )
                Spacer(Modifier.height(10.dp))
                Surface(
                    color = Ivory,
                    shape = RoundedCornerShape(18.dp),
                    border = BorderStroke(1.dp, Line),
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Column(Modifier.padding(14.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(
                                stringResource(R.string.plan_col_feature),
                                style = MaterialTheme.typography.labelSmall,
                                color = Muted,
                                modifier = Modifier.weight(1.25f),
                            )
                            Text(
                                stringResource(R.string.plan_col_free),
                                style = MaterialTheme.typography.labelSmall,
                                color = if (!premium) Forest else Muted,
                                fontWeight = if (!premium) FontWeight.SemiBold else FontWeight.Normal,
                                modifier = Modifier.weight(1f),
                            )
                            Text(
                                stringResource(R.string.plan_col_premium),
                                style = MaterialTheme.typography.labelSmall,
                                color = if (premium) Forest else Muted,
                                fontWeight = if (premium) FontWeight.SemiBold else FontWeight.Normal,
                                modifier = Modifier.weight(1f),
                            )
                        }
                        rows.forEachIndexed { index, row ->
                            if (index > 0) {
                                Box(
                                    Modifier
                                        .fillMaxWidth()
                                        .padding(vertical = 2.dp)
                                        .height(1.dp)
                                        .background(Line.copy(alpha = 0.6f)),
                                )
                            }
                            Row(
                                modifier = Modifier.padding(vertical = 8.dp),
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Text(
                                    row.first,
                                    style = MaterialTheme.typography.bodySmall,
                                    color = Forest,
                                    modifier = Modifier.weight(1.25f),
                                )
                                Text(
                                    row.second,
                                    style = MaterialTheme.typography.bodySmall,
                                    color = Muted,
                                    modifier = Modifier.weight(1f),
                                )
                                Text(
                                    row.third,
                                    style = MaterialTheme.typography.bodySmall,
                                    color = if (row.third == "—") Muted else SageInk,
                                    fontWeight = FontWeight.Medium,
                                    modifier = Modifier.weight(1f),
                                )
                            }
                        }
                    }
                }
                Spacer(Modifier.height(16.dp))
            }

            item {
                PlanNote(stringResource(R.string.plan_note_data))
                Spacer(Modifier.height(8.dp))
                PlanNote(stringResource(R.string.plan_note_export))
            }
        }
    }
}

@Composable
private fun planRows(): List<Triple<String, String, String>> {
    val maxAssets = Plans.FREE_MAX_ASSETS
    val maxEntries = Plans.FREE_MAX_ENTRIES
    val unlimited = stringResource(R.string.plan_unlimited)
    val none = "—"
    val yes = "✓"
    return listOf(
        Triple(
            stringResource(R.string.plan_row_mobile),
            stringResource(R.string.plan_value_mobile_free),
            stringResource(R.string.plan_value_mobile_premium),
        ),
        Triple(
            stringResource(R.string.plan_row_web),
            stringResource(R.string.plan_value_web_free),
            stringResource(R.string.plan_value_web_premium),
        ),
        Triple(
            stringResource(R.string.plan_row_assets),
            stringResource(R.string.plan_value_assets_free, maxAssets),
            unlimited,
        ),
        Triple(
            stringResource(R.string.plan_row_history),
            stringResource(R.string.plan_value_history_free, maxEntries),
            unlimited,
        ),
        Triple(
            stringResource(R.string.plan_row_photo),
            stringResource(R.string.plan_value_photo_free),
            stringResource(R.string.plan_value_photo_premium),
        ),
        Triple(
            stringResource(R.string.plan_row_storage),
            stringResource(R.string.plan_value_storage_free),
            unlimited,
        ),
        Triple(
            stringResource(R.string.plan_row_analytics),
            stringResource(R.string.plan_value_basic),
            stringResource(R.string.plan_value_advanced),
        ),
        Triple(stringResource(R.string.plan_row_compare), none, yes),
        Triple(stringResource(R.string.plan_row_reports), none, yes),
        Triple(
            stringResource(R.string.plan_row_cloud),
            stringResource(R.string.plan_value_cloud_limited),
            stringResource(R.string.plan_value_cloud_full),
        ),
        Triple(
            stringResource(R.string.plan_row_ads),
            stringResource(R.string.plan_value_ads_free),
            stringResource(R.string.plan_value_ads_premium),
        ),
    )
}

@Composable
private fun PlanWarningRow(warning: PlanWarning) {
    val blocked = warning.level == "blocked"
    Surface(
        color = if (blocked) TerracottaPale else SageLight,
        shape = RoundedCornerShape(12.dp),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Text(
            warningText(warning),
            style = MaterialTheme.typography.bodySmall,
            color = if (blocked) Danger else SageInk,
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 10.dp),
        )
    }
}

@Composable
private fun warningText(warning: PlanWarning): String {
    val blocked = warning.level == "blocked"
    return when (warning.limitKey) {
        "max_assets" -> if (blocked) {
            stringResource(
                R.string.plan_warning_assets_blocked,
                warning.used.toInt(),
                warning.limit.toInt(),
            )
        } else {
            stringResource(
                R.string.plan_warning_assets_near,
                warning.used.toInt(),
                warning.limit.toInt(),
            )
        }

        else -> if (blocked) {
            stringResource(
                R.string.plan_warning_storage_blocked,
                formatBytes(warning.used),
                formatBytes(warning.limit),
            )
        } else {
            stringResource(
                R.string.plan_warning_storage_near,
                formatBytes(warning.used),
                formatBytes(warning.limit),
                warning.pct,
            )
        }
    }
}

@Composable
private fun PlanStatBox(label: String, value: String, modifier: Modifier = Modifier) {
    Column(
        modifier = modifier
            .background(Paper.copy(alpha = 0.08f), RoundedCornerShape(10.dp))
            .padding(horizontal = 10.dp, vertical = 8.dp),
    ) {
        Text(
            label.uppercase(),
            style = MaterialTheme.typography.labelSmall,
            color = Sage,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
        Spacer(Modifier.height(2.dp))
        Text(
            value,
            style = MaterialTheme.typography.titleSmall,
            color = Paper,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
    }
}

@Composable
private fun PlanNote(text: String) {
    Row(verticalAlignment = Alignment.Top) {
        Icon(
            Icons.Outlined.CheckCircle,
            contentDescription = null,
            tint = SageInk,
            modifier = Modifier.size(16.dp),
        )
        Spacer(Modifier.width(8.dp))
        Text(text, style = MaterialTheme.typography.bodySmall, color = Muted)
    }
}
