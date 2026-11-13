package app.varlikhafizasi.ui.local

import android.content.Context
import android.content.Intent
import androidx.compose.runtime.Composable
import androidx.compose.ui.res.stringResource
import androidx.core.content.FileProvider
import app.varlikhafizasi.R
import java.io.File
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale

/** Yerel modun kayıt türleri; değerler buluta aktarımda aynen kullanılır. */
val localKinds: List<String> = listOf(
    "note", "maintenance", "health", "photo", "event", "acquisition",
)

/** Sunucu varlık tipleriyle eşleşen kanonik kategori adları. */
val localCategories: List<String> = listOf(
    "Bonsai", "Bitki", "Evcil hayvan", "Konum", "Araç", "Belge", "Koleksiyon", "Diğer",
)

fun formatLocalDate(millis: Long, withTime: Boolean = false): String {
    val pattern = if (withTime) "d MMMM yyyy · HH:mm" else "d MMMM yyyy"
    return DateTimeFormatter.ofPattern(pattern, Locale.getDefault())
        .withZone(ZoneId.systemDefault())
        .format(Instant.ofEpochMilli(millis))
}

@Composable
fun localCategoryLabel(value: String): String = when (value) {
    "Bonsai" -> stringResource(R.string.local_cat_bonsai)
    "Bitki" -> stringResource(R.string.local_cat_plant)
    "Evcil hayvan" -> stringResource(R.string.local_cat_pet)
    "Konum" -> stringResource(R.string.local_cat_place)
    "Araç" -> stringResource(R.string.local_cat_vehicle)
    "Belge" -> stringResource(R.string.local_cat_document)
    "Koleksiyon" -> stringResource(R.string.local_cat_collection)
    "Diğer" -> stringResource(R.string.local_cat_other)
    else -> value
}

@Composable
fun localKindLabel(kind: String): String = when (kind) {
    "maintenance" -> stringResource(R.string.local_kind_maintenance)
    "health" -> stringResource(R.string.local_kind_health)
    "photo" -> stringResource(R.string.local_kind_photo)
    "event" -> stringResource(R.string.local_kind_event)
    "acquisition" -> stringResource(R.string.local_kind_acquisition)
    else -> stringResource(R.string.local_kind_note)
}

/** Dışa aktarılan dosyayı sistem paylaşım sayfasıyla kullanıcıya açar. */
fun shareLocalFile(context: Context, file: File) {
    val mime = when (file.extension.lowercase()) {
        "zip" -> "application/zip"
        "csv" -> "text/csv"
        else -> "application/json"
    }
    val uri = FileProvider.getUriForFile(
        context,
        "${context.packageName}.fileprovider",
        file,
    )
    val intent = Intent(Intent.ACTION_SEND).apply {
        type = mime
        putExtra(Intent.EXTRA_STREAM, uri)
        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
    }
    context.startActivity(
        Intent.createChooser(intent, context.getString(R.string.local_export_share_title)),
    )
}
