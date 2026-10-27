package app.varlikhafizasi.ui.theme

import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.Typography
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

val Forest = Color(0xFF1C2B24)
val ForestSoft = Color(0xFF2C3F35)
val Paper = Color(0xFFF6F1E6)
val PaperDeep = Color(0xFFEDE5D5)
val Ivory = Color(0xFFFFFCF5)
val Sage = Color(0xFF8FA08A)
val SageLight = Color(0xFFDDE4D6)
val Clay = Color(0xFFB56242)
val ClayLight = Color(0xFFF1DED4)
val Gold = Color(0xFFC7A253)
val Ink = Color(0xFF222A25)
val Muted = Color(0xFF6E776F)
val Line = Color(0xFFDCD3C2)
val Danger = Color(0xFF973B2B)

private val VhColors = lightColorScheme(
    primary = Forest,
    onPrimary = Paper,
    primaryContainer = SageLight,
    onPrimaryContainer = Forest,
    secondary = Clay,
    onSecondary = Color.White,
    secondaryContainer = ClayLight,
    onSecondaryContainer = Color(0xFF4A2318),
    tertiary = Gold,
    onTertiary = Forest,
    background = Paper,
    onBackground = Ink,
    surface = Ivory,
    onSurface = Ink,
    surfaceVariant = PaperDeep,
    onSurfaceVariant = Muted,
    outline = Line,
    outlineVariant = Line,
    error = Danger,
    onError = Color.White,
)

private val VhTypography = Typography(
    displayLarge = TextStyle(
        fontFamily = FontFamily.Serif,
        fontWeight = FontWeight.Normal,
        fontSize = 44.sp,
        lineHeight = 48.sp,
        letterSpacing = (-0.5).sp,
    ),
    displayMedium = TextStyle(
        fontFamily = FontFamily.Serif,
        fontSize = 36.sp,
        lineHeight = 40.sp,
    ),
    headlineLarge = TextStyle(
        fontFamily = FontFamily.Serif,
        fontSize = 30.sp,
        lineHeight = 34.sp,
    ),
    headlineMedium = TextStyle(
        fontFamily = FontFamily.Serif,
        fontSize = 25.sp,
        lineHeight = 30.sp,
    ),
    headlineSmall = TextStyle(
        fontFamily = FontFamily.Serif,
        fontSize = 21.sp,
        lineHeight = 26.sp,
    ),
    titleLarge = TextStyle(
        fontFamily = FontFamily.Serif,
        fontSize = 19.sp,
        lineHeight = 24.sp,
    ),
    titleMedium = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.SemiBold,
        fontSize = 15.sp,
        lineHeight = 20.sp,
    ),
    titleSmall = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.SemiBold,
        fontSize = 13.sp,
        lineHeight = 17.sp,
    ),
    bodyLarge = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontSize = 15.sp,
        lineHeight = 23.sp,
    ),
    bodyMedium = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontSize = 13.5.sp,
        lineHeight = 20.sp,
    ),
    bodySmall = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontSize = 12.sp,
        lineHeight = 17.sp,
    ),
    labelLarge = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Medium,
        fontSize = 13.sp,
        letterSpacing = 0.2.sp,
    ),
    labelMedium = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Medium,
        fontSize = 11.sp,
        letterSpacing = 0.6.sp,
    ),
    labelSmall = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Medium,
        fontSize = 10.sp,
        letterSpacing = 1.sp,
    ),
)

private val VhShapes = Shapes(
    extraSmall = RoundedCornerShape(6.dp),
    small = RoundedCornerShape(10.dp),
    medium = RoundedCornerShape(16.dp),
    large = RoundedCornerShape(24.dp),
    extraLarge = RoundedCornerShape(32.dp),
)

@Composable
fun VhTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = VhColors,
        typography = VhTypography,
        shapes = VhShapes,
        content = content,
    )
}
