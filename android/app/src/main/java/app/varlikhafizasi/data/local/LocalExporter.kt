package app.varlikhafizasi.data.local

import android.content.Context
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonObjectBuilder
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import java.io.BufferedOutputStream
import java.io.File
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.zip.ZipEntry
import java.util.zip.ZipOutputStream

/**
 * Local verisini kullanıcıya açar. Ücretsiz sürümün verisi asla kilitli
 * değildir: JSON, CSV ve fotoğraflarla birlikte ZIP olarak dışa aktarılır.
 */
class LocalExporter(
    context: Context,
    private val store: LocalStore,
) {

    private val appContext = context.applicationContext
    private val json = Json { prettyPrint = true }

    private val exportDir: File
        get() = File(appContext.cacheDir, "exports").apply { mkdirs() }

    suspend fun exportJson(): LocalBackup = withContext(Dispatchers.IO) {
        val (assets, entries) = snapshot()
        val file = newFile("izleer-veri", "json")
        file.writeText(json.encodeToString(JsonObject.serializer(), buildPayload(assets, entries)))
        LocalBackup(file, assets.size + entries.size)
    }

    /** Kayıt odaklı tek CSV; Excel'de Türkçe karakterler için BOM eklenir. */
    suspend fun exportCsv(): LocalBackup = withContext(Dispatchers.IO) {
        val (assets, entries) = snapshot()
        val file = newFile("izleer-kayitlar", "csv")
        file.writeText("\uFEFF" + entriesCsv(assets, entries))
        LocalBackup(file, entries.size)
    }

    /** JSON + iki CSV + fotoğraflar; tam yedek ve başka cihaza taşıma içindir. */
    suspend fun exportZip(): LocalBackup = withContext(Dispatchers.IO) {
        val (assets, entries) = snapshot()
        val file = newFile("izleer-yedek", "zip")
        ZipOutputStream(BufferedOutputStream(file.outputStream())).use { zip ->
            fun putText(name: String, content: String) {
                zip.putNextEntry(ZipEntry(name))
                zip.write(content.toByteArray(Charsets.UTF_8))
                zip.closeEntry()
            }

            putText(
                "veri.json",
                json.encodeToString(JsonObject.serializer(), buildPayload(assets, entries)),
            )
            putText("varliklar.csv", "\uFEFF" + assetsCsv(assets))
            putText("kayitlar.csv", "\uFEFF" + entriesCsv(assets, entries))
            putText("OKU-BENI.txt", readme())

            val files = buildSet {
                assets.mapNotNullTo(this) { it.coverPath }
                entries.mapNotNullTo(this) { it.photoPath }
            }
            files.forEach { name ->
                val media = store.mediaFile(name) ?: return@forEach
                if (!media.exists()) return@forEach
                zip.putNextEntry(ZipEntry("fotograflar/$name"))
                media.inputStream().use { it.copyTo(zip) }
                zip.closeEntry()
            }
        }
        val photos = assets.count { it.coverPath != null } + entries.count { it.photoPath != null }
        LocalBackup(file, assets.size + entries.size + photos)
    }

    private suspend fun snapshot(): Pair<List<LocalAsset>, List<LocalEntry>> {
        val assets = store.assets()
        val entries = store.allEntries()
        return assets to entries
    }

    private fun buildPayload(assets: List<LocalAsset>, entries: List<LocalEntry>): JsonObject {
        val byAsset = entries.groupBy { it.assetId }
        return buildJsonObject {
            put("app", "izleer")
            put("format", "izleer-local")
            put("schema", 1)
            put("exportedAt", Instant.now().toString())
            put(
                "assets",
                JsonArray(
                    assets.map { asset ->
                        buildJsonObject {
                            put("id", asset.id)
                            put("title", asset.title)
                            put("category", asset.category)
                            putNullable("description", asset.description)
                            putNullable("coverPhoto", asset.coverPath)
                            put("createdAt", iso(asset.createdAt))
                            put("updatedAt", iso(asset.updatedAt))
                            put(
                                "entries",
                                JsonArray(
                                    byAsset[asset.id].orEmpty().map { entry ->
                                        buildJsonObject {
                                            put("id", entry.id)
                                            put("kind", entry.kind)
                                            putNullable("title", entry.title)
                                            putNullable("body", entry.body)
                                            put("occurredAt", iso(entry.occurredAt))
                                            putNullable("dueAt", entry.dueAt?.let(::iso))
                                            putNullable("doneAt", entry.doneAt?.let(::iso))
                                            putNullable("photo", entry.photoPath)
                                            putNullable("locationName", entry.locationName)
                                            put("latitude", entry.latitude)
                                            put("longitude", entry.longitude)
                                        }
                                    },
                                ),
                            )
                        }
                    },
                ),
            )
        }
    }

    private fun JsonObjectBuilder.putNullable(key: String, value: String?) {
        if (value == null) put(key, JsonNull) else put(key, value)
    }

    private fun assetsCsv(assets: List<LocalAsset>): String = buildString {
        appendLine("id;baslik;kategori;aciklama;olusturma;guncelleme;kapak_fotografi")
        assets.forEach { asset ->
            appendLine(
                listOf(
                    asset.id,
                    asset.title,
                    asset.category,
                    asset.description.orEmpty(),
                    iso(asset.createdAt),
                    iso(asset.updatedAt),
                    asset.coverPath.orEmpty(),
                ).joinToString(";") { csvCell(it) },
            )
        }
    }

    private fun entriesCsv(assets: List<LocalAsset>, entries: List<LocalEntry>): String = buildString {
        appendLine("id;varlik_id;varlik;tur;baslik;icerik;tarih;hatirlatma;tamamlandi;fotograf;konum;enlem;boylam")
        val titles = assets.associate { it.id to it.title }
        entries.forEach { entry ->
            appendLine(
                listOf(
                    entry.id,
                    entry.assetId,
                    titles[entry.assetId].orEmpty(),
                    entry.kind,
                    entry.title.orEmpty(),
                    entry.body.orEmpty(),
                    iso(entry.occurredAt),
                    entry.dueAt?.let(::iso).orEmpty(),
                    entry.doneAt?.let(::iso).orEmpty(),
                    entry.photoPath.orEmpty(),
                    entry.locationName.orEmpty(),
                    entry.latitude?.toString().orEmpty(),
                    entry.longitude?.toString().orEmpty(),
                ).joinToString(";") { csvCell(it) },
            )
        }
    }

    private fun csvCell(value: String): String {
        val needsQuotes = value.any { it == ';' || it == '"' || it == '\n' || it == '\r' }
        val escaped = value.replace("\"", "\"\"")
        return if (needsQuotes) "\"$escaped\"" else escaped
    }

    private fun readme(): String = """
        izleer yerel yedek
        ==================
        Bu arşiv, izleer Local'de oluşturduğunuz bütün kayıtları içerir.
        Verileriniz size aittir; hesap açmadan da dışa aktarabilirsiniz.

        veri.json        : Varlıklar, kayıtlar ve hatırlatmalar (tam veri)
        varliklar.csv    : Varlık listesi (Excel uyumlu)
        kayitlar.csv     : Kayıt listesi (Excel uyumlu)
        fotograflar/     : Kayıtlara ve varlıklara bağlı fotoğraflar

        Arşivi saklayın; başka bir cihaza veya izleer Cloud'a taşırken
        kayıtlarınızı kaybetmeden kullanabilirsiniz.
    """.trimIndent()

    private fun iso(millis: Long): String = Instant.ofEpochMilli(millis).toString()

    private fun newFile(prefix: String, extension: String): File {
        val stamp = DateTimeFormatter.ofPattern("yyyyMMdd-HHmm")
            .withZone(ZoneId.systemDefault())
            .format(Instant.now())
        // Eski denemeler birikmesin; yalnızca son yedekler kalsın.
        exportDir.listFiles()
            ?.filter { it.isFile && System.currentTimeMillis() - it.lastModified() > 86_400_000L }
            ?.forEach { runCatching { it.delete() } }
        return File(exportDir, "$prefix-$stamp.$extension").apply { parentFile?.mkdirs() }
    }
}
