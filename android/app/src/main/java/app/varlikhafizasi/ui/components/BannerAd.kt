package app.varlikhafizasi.ui.components

import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import app.varlikhafizasi.BuildConfig
import app.varlikhafizasi.R
import app.varlikhafizasi.ui.theme.Muted
import com.google.android.gms.ads.AdListener
import com.google.android.gms.ads.AdRequest
import com.google.android.gms.ads.AdSize
import com.google.android.gms.ads.AdView

/**
 * Ücretsiz (freemium) plan ekranlarında gösterilen AdMob banner'ı.
 * Birim kimliği varsayılan olarak Google'ın test banner'ıdır; yayın için
 * `-PadmobBannerUnit=ca-app-pub-.../...` ile derlenir.
 */
@Composable
fun BannerAd(modifier: Modifier = Modifier) {
    var loaded by remember { mutableStateOf(false) }
    Column(
        modifier = modifier.fillMaxWidth(),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        if (loaded) {
            Text(
                text = stringResource(R.string.ads_label),
                style = MaterialTheme.typography.labelSmall,
                color = Muted,
                modifier = Modifier.padding(bottom = 4.dp),
            )
        }
        BoxWithConstraints(Modifier.fillMaxWidth()) {
            // Cihaz genişliğine oturan, sabit yüksekliği olmayan banner.
            val widthDp = maxWidth.value.toInt().coerceAtLeast(320)
            AndroidView(
                modifier = Modifier.align(Alignment.Center),
                factory = { context ->
                    AdView(context).apply {
                        adUnitId = BuildConfig.ADMOB_BANNER_UNIT
                        setAdSize(
                            AdSize.getCurrentOrientationAnchoredAdaptiveBannerAdSize(
                                context,
                                widthDp,
                            ),
                        )
                        adListener = object : AdListener() {
                            override fun onAdLoaded() {
                                loaded = true
                            }

                            override fun onAdFailedToLoad(error: com.google.android.gms.ads.LoadAdError) {
                                loaded = false
                            }
                        }
                        loadAd(AdRequest.Builder().build())
                    }
                },
                onRelease = { adView -> adView.destroy() },
            )
        }
    }
}
