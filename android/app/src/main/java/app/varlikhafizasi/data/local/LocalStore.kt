package app.varlikhafizasi.data.local

import android.content.ContentValues
import android.content.Context
import android.database.Cursor
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import android.net.Uri
import androidx.core.content.FileProvider
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File
import java.io.IOException
import java.util.UUID

/**
 * Hesapsız (Local) modun tek doğruluk kaynağı. Bütün varlık, kayıt ve
 * hatırlatmalar SQLite'ta; fotoğraflar uygulamanın özel `local-media`
 * dizininde tutulur. İnternet gerekmez.
 */
class LocalStore(context: Context) {

    private val appContext = context.applicationContext
    private val helper = Helper(appContext)

    private val mediaDir: File
        get() = File(appContext.filesDir, "local-media").apply { mkdirs() }

    // ------------------------------------------------------------------
    // Varlıklar
    // ------------------------------------------------------------------

    suspend fun assetSummaries(): List<LocalAssetSummary> = withContext(Dispatchers.IO) {
        val sql = """
            SELECT a.*,
                   (SELECT count(*) FROM local_entries e WHERE e.asset_id = a.id) AS entry_count,
                   (SELECT count(*) FROM local_entries e
                     WHERE e.asset_id = a.id AND e.photo_path IS NOT NULL) AS photo_count,
                   (SELECT max(e.occurred_at) FROM local_entries e WHERE e.asset_id = a.id) AS last_entry
            FROM local_assets a
            ORDER BY coalesce(last_entry, a.created_at) DESC, a.title COLLATE NOCASE ASC
        """.trimIndent()
        helper.readableDatabase.rawQuery(sql, null).use { cursor ->
            buildList {
                while (cursor.moveToNext()) {
                    add(
                        LocalAssetSummary(
                            asset = cursor.asset(),
                            entryCount = cursor.getInt(cursor.getColumnIndexOrThrow("entry_count")),
                            photoCount = cursor.getInt(cursor.getColumnIndexOrThrow("photo_count")),
                            lastEntryAt = cursor.nullableLong("last_entry"),
                        ),
                    )
                }
            }
        }
    }

    suspend fun assets(): List<LocalAsset> = withContext(Dispatchers.IO) {
        helper.readableDatabase.rawQuery(
            "SELECT * FROM local_assets ORDER BY updated_at DESC",
            null,
        ).use { cursor ->
            buildList { while (cursor.moveToNext()) add(cursor.asset()) }
        }
    }

    suspend fun asset(id: String): LocalAsset? = withContext(Dispatchers.IO) {
        helper.readableDatabase.rawQuery(
            "SELECT * FROM local_assets WHERE id = ?",
            arrayOf(id),
        ).use { if (it.moveToFirst()) it.asset() else null }
    }

    suspend fun upsertAsset(asset: LocalAsset) = withContext(Dispatchers.IO) {
        helper.writableDatabase.insertWithOnConflict(
            "local_assets",
            null,
            ContentValues().apply {
                put("id", asset.id)
                put("title", asset.title)
                put("category", asset.category)
                put("description", asset.description)
                put("cover_path", asset.coverPath)
                put("created_at", asset.createdAt)
                put("updated_at", asset.updatedAt)
                put("cloud_asset_id", asset.cloudAssetId)
            },
            SQLiteDatabase.CONFLICT_REPLACE,
        )
        Unit
    }

    suspend fun setCloudAssetId(id: String, cloudId: String) = withContext(Dispatchers.IO) {
        helper.writableDatabase.execSQL(
            "UPDATE local_assets SET cloud_asset_id = ? WHERE id = ?",
            arrayOf(cloudId, id),
        )
    }

    /** Varlığı, kayıtlarını ve fotoğraflarını siler. */
    suspend fun deleteAsset(id: String) = withContext(Dispatchers.IO) {
        val db = helper.writableDatabase
        val photos = mutableListOf<String>()
        asset(id)?.coverPath?.let(photos::add)
        db.rawQuery(
            "SELECT photo_path FROM local_entries WHERE asset_id = ? AND photo_path IS NOT NULL",
            arrayOf(id),
        ).use { cursor ->
            while (cursor.moveToNext()) cursor.getString(0)?.let(photos::add)
        }
        db.delete("local_entries", "asset_id = ?", arrayOf(id))
        db.delete("local_assets", "id = ?", arrayOf(id))
        photos.forEach(::deleteMediaFile)
        Unit
    }

    // ------------------------------------------------------------------
    // Kayıtlar
    // ------------------------------------------------------------------

    suspend fun entries(assetId: String): List<LocalEntry> = withContext(Dispatchers.IO) {
        helper.readableDatabase.rawQuery(
            "SELECT * FROM local_entries WHERE asset_id = ? ORDER BY occurred_at DESC, created_at DESC",
            arrayOf(assetId),
        ).use { cursor ->
            buildList { while (cursor.moveToNext()) add(cursor.entry()) }
        }
    }

    suspend fun allEntries(): List<LocalEntry> = withContext(Dispatchers.IO) {
        helper.readableDatabase.rawQuery(
            "SELECT * FROM local_entries ORDER BY occurred_at DESC",
            null,
        ).use { cursor ->
            buildList { while (cursor.moveToNext()) add(cursor.entry()) }
        }
    }

    suspend fun entry(id: String): LocalEntry? = withContext(Dispatchers.IO) {
        helper.readableDatabase.rawQuery(
            "SELECT * FROM local_entries WHERE id = ?",
            arrayOf(id),
        ).use { if (it.moveToFirst()) it.entry() else null }
    }

    suspend fun entryCount(assetId: String): Int = withContext(Dispatchers.IO) {
        helper.readableDatabase.rawQuery(
            "SELECT count(*) FROM local_entries WHERE asset_id = ?",
            arrayOf(assetId),
        ).use { if (it.moveToFirst()) it.getInt(0) else 0 }
    }

    suspend fun upsertEntry(entry: LocalEntry) = withContext(Dispatchers.IO) {
        helper.writableDatabase.insertWithOnConflict(
            "local_entries",
            null,
            ContentValues().apply {
                put("id", entry.id)
                put("asset_id", entry.assetId)
                put("kind", entry.kind)
                put("title", entry.title)
                put("body", entry.body)
                put("occurred_at", entry.occurredAt)
                put("due_at", entry.dueAt)
                put("done_at", entry.doneAt)
                put("photo_path", entry.photoPath)
                put("location_name", entry.locationName)
                put("latitude", entry.latitude)
                put("longitude", entry.longitude)
                put("created_at", entry.createdAt)
                put("updated_at", entry.updatedAt)
                put("cloud_entry_id", entry.cloudEntryId)
            },
            SQLiteDatabase.CONFLICT_REPLACE,
        )
        Unit
    }

    suspend fun setCloudEntryId(id: String, cloudId: String) = withContext(Dispatchers.IO) {
        helper.writableDatabase.execSQL(
            "UPDATE local_entries SET cloud_entry_id = ? WHERE id = ?",
            arrayOf(cloudId, id),
        )
    }

    suspend fun setReminderDone(entryId: String, done: Boolean) = withContext(Dispatchers.IO) {
        helper.writableDatabase.execSQL(
            "UPDATE local_entries SET done_at = ?, updated_at = ? WHERE id = ?",
            arrayOf(if (done) System.currentTimeMillis() else null, System.currentTimeMillis(), entryId),
        )
    }

    suspend fun deleteEntry(id: String) = withContext(Dispatchers.IO) {
        val db = helper.writableDatabase
        val photo = db.rawQuery(
            "SELECT photo_path FROM local_entries WHERE id = ?",
            arrayOf(id),
        ).use { if (it.moveToFirst()) it.getString(0) else null }
        db.delete("local_entries", "id = ?", arrayOf(id))
        photo?.let(::deleteMediaFile)
        Unit
    }

    // ------------------------------------------------------------------
    // Hatırlatmalar ve özet
    // ------------------------------------------------------------------

    suspend fun reminders(): List<LocalReminder> = withContext(Dispatchers.IO) {
        val sql = """
            SELECT e.id AS entry_id, e.asset_id, a.title AS asset_title,
                   e.title, e.body, e.due_at, e.done_at
            FROM local_entries e
            JOIN local_assets a ON a.id = e.asset_id
            WHERE e.due_at IS NOT NULL
            ORDER BY e.due_at ASC
        """.trimIndent()
        helper.readableDatabase.rawQuery(sql, null).use { cursor ->
            buildList {
                while (cursor.moveToNext()) {
                    add(
                        LocalReminder(
                            entryId = cursor.getString(cursor.getColumnIndexOrThrow("entry_id")),
                            assetId = cursor.getString(cursor.getColumnIndexOrThrow("asset_id")),
                            assetTitle = cursor.getString(cursor.getColumnIndexOrThrow("asset_title")),
                            title = cursor.getStringOrNull("title"),
                            body = cursor.getStringOrNull("body"),
                            dueAt = cursor.getLong(cursor.getColumnIndexOrThrow("due_at")),
                            done = !cursor.isNull(cursor.getColumnIndexOrThrow("done_at")),
                        ),
                    )
                }
            }
        }
    }

    suspend fun counts(): LocalCounts = withContext(Dispatchers.IO) {
        helper.readableDatabase.rawQuery(
            """
            SELECT
              (SELECT count(*) FROM local_assets) AS assets,
              (SELECT count(*) FROM local_entries) AS entries,
              (SELECT count(*) FROM local_assets WHERE cover_path IS NOT NULL)
                + (SELECT count(*) FROM local_entries WHERE photo_path IS NOT NULL) AS photos,
              (SELECT count(*) FROM local_entries WHERE due_at IS NOT NULL AND done_at IS NULL) AS reminders
            """.trimIndent(),
            null,
        ).use { cursor ->
            if (!cursor.moveToFirst()) return@use LocalCounts()
            LocalCounts(
                assets = cursor.getInt(0),
                entries = cursor.getInt(1),
                photos = cursor.getInt(2),
                openReminders = cursor.getInt(3),
            )
        }
    }

    suspend fun hasData(): Boolean = withContext(Dispatchers.IO) {
        helper.readableDatabase.rawQuery(
            "SELECT (SELECT count(*) FROM local_assets) + (SELECT count(*) FROM local_entries)",
            null,
        ).use { it.moveToFirst() && it.getInt(0) > 0 }
    }

    /** Bütün yerel veriyi ve fotoğrafları siler. */
    suspend fun deleteAll() = withContext(Dispatchers.IO) {
        val db = helper.writableDatabase
        db.delete("local_entries", null, null)
        db.delete("local_assets", null, null)
        mediaDir.listFiles()?.forEach { runCatching { it.delete() } }
        Unit
    }

    // ------------------------------------------------------------------
    // Medya
    // ------------------------------------------------------------------

    fun mediaFile(name: String?): File? =
        name?.takeIf { it.isNotBlank() }?.let { File(mediaDir, it) }

    fun mediaUri(file: File): Uri = FileProvider.getUriForFile(
        appContext,
        "${appContext.packageName}.fileprovider",
        file,
    )

    /**
     * Fotoğrafın kalıcı kopyasını oluşturur. Kamera ve galeri akışlarının
     * ikisi de bu yolu kullanır; dönen değer veritabanındaki `*_path` alanıdır.
     */
    suspend fun saveMedia(uri: Uri, prefix: String): String? = withContext(Dispatchers.IO) {
        val resolver = appContext.contentResolver
        val mime = resolver.getType(uri)
        val extension = when (mime) {
            "image/png" -> "png"
            "image/webp" -> "webp"
            else -> "jpg"
        }
        val file = newMediaFile(prefix, extension)
        val input = resolver.openInputStream(uri) ?: throw IOException("Medya okunamadı")
        input.use { source ->
            file.outputStream().use { target -> source.copyTo(target) }
        }
        if (file.length() <= 0L) {
            file.delete()
            throw IOException("Boş medya")
        }
        file.name
    }

    /** Kamera için boş bir hedef dosya üretir; iptal edilirse silinmelidir. */
    fun newMediaFile(prefix: String, extension: String = "jpg"): File {
        val file = File(
            mediaDir,
            "$prefix-${System.currentTimeMillis()}-${UUID.randomUUID().toString().take(8)}.$extension",
        )
        file.parentFile?.mkdirs()
        return file
    }

    fun deleteMediaFile(name: String) {
        runCatching { mediaFile(name)?.delete() }
    }

    // ------------------------------------------------------------------
    // Cursor eşlemesi
    // ------------------------------------------------------------------

    private fun Cursor.asset() = LocalAsset(
        id = getString(getColumnIndexOrThrow("id")),
        title = getString(getColumnIndexOrThrow("title")),
        category = getString(getColumnIndexOrThrow("category")),
        description = getStringOrNull("description"),
        coverPath = getStringOrNull("cover_path"),
        createdAt = getLong(getColumnIndexOrThrow("created_at")),
        updatedAt = getLong(getColumnIndexOrThrow("updated_at")),
        cloudAssetId = getStringOrNull("cloud_asset_id"),
    )

    private fun Cursor.entry() = LocalEntry(
        id = getString(getColumnIndexOrThrow("id")),
        assetId = getString(getColumnIndexOrThrow("asset_id")),
        kind = getString(getColumnIndexOrThrow("kind")),
        title = getStringOrNull("title"),
        body = getStringOrNull("body"),
        occurredAt = getLong(getColumnIndexOrThrow("occurred_at")),
        dueAt = nullableLong("due_at"),
        doneAt = nullableLong("done_at"),
        photoPath = getStringOrNull("photo_path"),
        locationName = getStringOrNull("location_name"),
        latitude = nullableDouble("latitude"),
        longitude = nullableDouble("longitude"),
        createdAt = getLong(getColumnIndexOrThrow("created_at")),
        updatedAt = getLong(getColumnIndexOrThrow("updated_at")),
        cloudEntryId = getStringOrNull("cloud_entry_id"),
    )

    private fun Cursor.getStringOrNull(column: String): String? {
        val index = getColumnIndexOrThrow(column)
        return if (isNull(index)) null else getString(index)
    }

    private fun Cursor.nullableLong(column: String): Long? {
        val index = getColumnIndexOrThrow(column)
        return if (isNull(index)) null else getLong(index)
    }

    private fun Cursor.nullableDouble(column: String): Double? {
        val index = getColumnIndexOrThrow(column)
        return if (isNull(index)) null else getDouble(index)
    }

    private class Helper(context: Context) :
        SQLiteOpenHelper(context, "izleer_local.db", null, 2) {

        override fun onConfigure(db: SQLiteDatabase) {
            db.setForeignKeyConstraintsEnabled(true)
        }

        override fun onCreate(db: SQLiteDatabase) {
            db.execSQL(
                """
                CREATE TABLE local_assets (
                    id TEXT PRIMARY KEY NOT NULL,
                    title TEXT NOT NULL,
                    category TEXT NOT NULL DEFAULT '',
                    description TEXT,
                    cover_path TEXT,
                    created_at INTEGER NOT NULL,
                    updated_at INTEGER NOT NULL,
                    cloud_asset_id TEXT
                )
                """.trimIndent(),
            )
            db.execSQL(
                """
                CREATE TABLE local_entries (
                    id TEXT PRIMARY KEY NOT NULL,
                    asset_id TEXT NOT NULL REFERENCES local_assets(id) ON DELETE CASCADE,
                    kind TEXT NOT NULL DEFAULT 'note',
                    title TEXT,
                    body TEXT,
                    occurred_at INTEGER NOT NULL,
                    due_at INTEGER,
                    done_at INTEGER,
                    photo_path TEXT,
                    location_name TEXT,
                    latitude REAL,
                    longitude REAL,
                    created_at INTEGER NOT NULL,
                    updated_at INTEGER NOT NULL,
                    cloud_entry_id TEXT
                )
                """.trimIndent(),
            )
            db.execSQL(
                "CREATE INDEX local_entries_asset_idx ON local_entries(asset_id, occurred_at DESC)",
            )
        }

        override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) {
            // Sürüm 2: kayıtlara bulut paritesinde konum alanları eklendi.
            if (oldVersion < 2) {
                db.execSQL("ALTER TABLE local_entries ADD COLUMN location_name TEXT")
                db.execSQL("ALTER TABLE local_entries ADD COLUMN latitude REAL")
                db.execSQL("ALTER TABLE local_entries ADD COLUMN longitude REAL")
            }
        }
    }
}
