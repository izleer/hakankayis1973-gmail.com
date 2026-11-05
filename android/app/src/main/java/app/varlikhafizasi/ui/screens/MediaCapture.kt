package app.varlikhafizasi.ui.screens

import android.content.Context
import android.net.Uri
import androidx.core.content.FileProvider
import java.io.File

/**
 * Kamera uygulamasının fotoğrafı yazacağı geçici içerik adresini üretir.
 * Dosya, uygulamanın önbelleğinde tutulur ve FileProvider ile paylaşılır.
 */
fun createCaptureUri(context: Context, prefix: String): Uri {
    val directory = File(context.cacheDir, "captures").apply { mkdirs() }
    val file = File(directory, "$prefix-${System.currentTimeMillis()}.jpg")
    return FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", file)
}
