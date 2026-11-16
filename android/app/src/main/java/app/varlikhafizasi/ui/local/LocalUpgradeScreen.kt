package app.varlikhafizasi.ui.local

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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import app.varlikhafizasi.R
import app.varlikhafizasi.data.Plans
import app.varlikhafizasi.ui.components.GoldRule
import app.varlikhafizasi.ui.components.SectionLabel
import app.varlikhafizasi.ui.components.VhTopBar
import app.varlikhafizasi.ui.theme.Forest
import app.varlikhafizasi.ui.theme.Ivory
import app.varlikhafizasi.ui.theme.Line
import app.varlikhafizasi.ui.theme.Muted
import app.varlikhafizasi.ui.theme.Paper
import app.varlikhafizasi.ui.theme.PaperDeep
import app.varlikhafizasi.ui.theme.TerracottaInk
import app.varlikhafizasi.ui.theme.TerracottaPale

/**
 * Ücretsiz Local ile abonelik gerektiren Cloud arasındaki sınırı gösterir.
 * Verinin kilitli olmadığı burada da açıkça belirtilir.
 */
@Composable
fun LocalUpgradeScreen(
    onBack: () -> Unit,
    onSwitchToCloud: () -> Unit,
) {
    val included = stringResource(R.string.local_matrix_included)
    val unlimited = stringResource(R.string.plan_unlimited)
    val none = stringResource(R.string.local_matrix_none)
    val yes = "✓"

    val rows = listOf(
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
            stringResource(R.string.plan_value_assets_free, Plans.FREE_MAX_ASSETS),
            unlimited,
        ),
        Triple(
            stringResource(R.string.plan_row_history),
            stringResource(R.string.plan_value_history_free, Plans.FREE_MAX_ENTRIES),
            unlimited,
        ),
        Triple(
            stringResource(R.string.plan_row_photo),
            stringResource(R.string.plan_value_photo_free),
            stringResource(R.string.plan_value_photo_premium),
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
        Triple(stringResource(R.string.local_feature_export), included, included),
    )

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Paper),
    ) {
        VhTopBar(
            title = stringResource(R.string.local_upgrade_title),
            onBack = onBack,
        )

        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp, vertical = 8.dp),
        ) {
            SectionLabel("LOCAL → CLOUD")
            Text(
                stringResource(R.string.local_upgrade_title),
                style = MaterialTheme.typography.headlineMedium,
                color = Forest,
            )
            Spacer(Modifier.height(10.dp))
            GoldRule()
            Spacer(Modifier.height(10.dp))
            Text(
                stringResource(R.string.local_upgrade_body),
                style = MaterialTheme.typography.bodyMedium,
                color = Muted,
            )

            Spacer(Modifier.height(20.dp))
            Surface(
                color = Ivory,
                shape = RoundedCornerShape(18.dp),
                modifier = Modifier.fillMaxWidth(),
            ) {
                Column(Modifier.padding(14.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            stringResource(R.string.local_matrix_feature),
                            style = MaterialTheme.typography.labelSmall,
                            color = Muted,
                            modifier = Modifier.weight(1.5f),
                        )
                        Text(
                            stringResource(R.string.plan_col_free),
                            style = MaterialTheme.typography.labelSmall,
                            color = Forest,
                            modifier = Modifier.weight(1f),
                        )
                        Text(
                            stringResource(R.string.plan_col_premium),
                            style = MaterialTheme.typography.labelSmall,
                            color = TerracottaInk,
                            modifier = Modifier.weight(1f),
                        )
                    }
                    Spacer(Modifier.height(8.dp))
                    rows.forEachIndexed { index, row ->
                        if (index > 0) {
                            Box(
                                Modifier
                                    .fillMaxWidth()
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
                                modifier = Modifier.weight(1.5f),
                            )
                            MatrixValue(row.second, Modifier.weight(1f))
                            MatrixValue(row.third, Modifier.weight(1f), accent = true)
                        }
                    }
                }
            }

            Spacer(Modifier.height(18.dp))
            Surface(
                color = TerracottaPale,
                shape = RoundedCornerShape(16.dp),
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text(
                    stringResource(R.string.local_upgrade_note),
                    style = MaterialTheme.typography.bodySmall,
                    color = TerracottaInk,
                    modifier = Modifier.padding(14.dp),
                )
            }

            Spacer(Modifier.height(18.dp))
            Surface(
                color = Forest,
                shape = RoundedCornerShape(50),
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { onSwitchToCloud() },
            ) {
                Text(
                    stringResource(R.string.local_upgrade_cta),
                    style = MaterialTheme.typography.labelLarge,
                    color = Paper,
                    fontWeight = FontWeight.SemiBold,
                    textAlign = TextAlign.Center,
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 14.dp),
                )
            }

            Spacer(Modifier.height(16.dp))
            Text(
                stringResource(R.string.local_footer),
                style = MaterialTheme.typography.bodySmall,
                color = Muted,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 24.dp),
            )
        }
    }
}

@Composable
private fun MatrixValue(text: String, modifier: Modifier = Modifier, accent: Boolean = false) {
    val value = if (text == "✓") "✓" else text
    Text(
        value,
        style = MaterialTheme.typography.bodySmall,
        color = when (value) {
            "—" -> Muted
            "✓" -> if (accent) Forest else Forest
            else -> if (accent) TerracottaInk else Muted
        },
        fontWeight = if (value == "✓") FontWeight.SemiBold else FontWeight.Normal,
        modifier = modifier,
    )
}
