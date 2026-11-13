package app.varlikhafizasi.ui.local

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import androidx.compose.material.icons.outlined.Cloud
import androidx.compose.material.icons.outlined.Smartphone
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import app.varlikhafizasi.R
import app.varlikhafizasi.ui.components.GoldRule
import app.varlikhafizasi.ui.components.SectionLabel
import app.varlikhafizasi.ui.theme.Forest
import app.varlikhafizasi.ui.theme.Ivory
import app.varlikhafizasi.ui.theme.Muted
import app.varlikhafizasi.ui.theme.Paper
import app.varlikhafizasi.ui.theme.TerracottaInk
import app.varlikhafizasi.ui.theme.TerracottaPale

/**
 * İlk açılışta hesapsız yerel mod ile bulut hesabı arasında seçim.
 * Yerel mod seçildiğinde hiçbir hesap veya ağ isteği yapılmaz.
 */
@Composable
fun LocalOnboardingScreen(
    onLocal: () -> Unit,
    onCloud: () -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Paper)
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 24.dp, vertical = 30.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            androidx.compose.foundation.layout.Box(
                modifier = Modifier
                    .size(44.dp)
                    .background(Forest, RoundedCornerShape(13.dp)),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    "iz",
                    style = MaterialTheme.typography.titleMedium,
                    color = Paper,
                    fontFamily = FontFamily.Serif,
                )
            }
            Spacer(Modifier.size(12.dp))
            Column {
                Text("İZLEER", style = MaterialTheme.typography.labelMedium, color = Forest)
                Text(
                    stringResource(R.string.local_tagline),
                    style = MaterialTheme.typography.bodySmall,
                    color = Muted,
                )
            }
        }

        Spacer(Modifier.height(42.dp))
        SectionLabel(stringResource(R.string.local_onboarding_eyebrow))
        Text(
            stringResource(R.string.local_onboarding_title),
            style = MaterialTheme.typography.displayMedium,
            color = Forest,
        )
        Spacer(Modifier.height(14.dp))
        GoldRule()
        Spacer(Modifier.height(14.dp))
        Text(
            stringResource(R.string.local_onboarding_body),
            style = MaterialTheme.typography.bodyMedium,
            color = Muted,
        )

        Spacer(Modifier.height(26.dp))
        ModeCard(
            title = stringResource(R.string.local_onboarding_local_title),
            body = stringResource(R.string.local_onboarding_local_body),
            tag = stringResource(R.string.local_offline_badge),
            primary = true,
            onClick = onLocal,
        ) {
            Icon(
                Icons.Outlined.Smartphone,
                contentDescription = null,
                tint = TerracottaPale,
                modifier = Modifier.size(24.dp),
            )
        }

        Spacer(Modifier.height(12.dp))
        ModeCard(
            title = stringResource(R.string.local_onboarding_cloud_title),
            body = stringResource(R.string.local_onboarding_cloud_body),
            tag = null,
            primary = false,
            onClick = onCloud,
        ) {
            Icon(
                Icons.Outlined.Cloud,
                contentDescription = null,
                tint = Forest,
                modifier = Modifier.size(24.dp),
            )
        }

        Spacer(Modifier.height(22.dp))
        Text(
            stringResource(R.string.local_onboarding_note),
            style = MaterialTheme.typography.bodySmall,
            color = Muted,
        )
        Spacer(Modifier.height(24.dp))
    }
}

@Composable
private fun ModeCard(
    title: String,
    body: String,
    tag: String?,
    primary: Boolean,
    onClick: () -> Unit,
    icon: @Composable () -> Unit,
) {
    Surface(
        color = if (primary) Forest else Ivory,
        shape = RoundedCornerShape(22.dp),
        border = if (primary) null else BorderStroke(1.dp, Color(0xFFE0D6C4)),
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() },
    ) {
        Column(Modifier.padding(18.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                icon()
                Spacer(Modifier.size(10.dp))
                Text(
                    title,
                    style = MaterialTheme.typography.titleLarge,
                    color = if (primary) Paper else Forest,
                )
            }
            Spacer(Modifier.height(8.dp))
            Text(
                body,
                style = MaterialTheme.typography.bodyMedium,
                color = if (primary) Paper.copy(alpha = 0.78f) else Muted,
            )
            if (tag != null) {
                Spacer(Modifier.height(12.dp))
                Surface(
                    color = TerracottaPale.copy(alpha = 0.2f),
                    shape = RoundedCornerShape(50),
                ) {
                    Text(
                        tag,
                        style = MaterialTheme.typography.labelSmall,
                        color = TerracottaInk,
                        fontWeight = FontWeight.SemiBold,
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp),
                    )
                }
            }
        }
    }
}
