package app.varlikhafizasi.data.local

/**
 * Yerel modda bütün veri cihazda tutulur. Kimlikler UUID'dir; buluta
 * aktarıldığında eşleşmeyi korumak için `cloudId` alanı doldurulur.
 */
data class LocalAsset(
    val id: String,
    val title: String,
    val category: String,
    val description: String? = null,
    /** local-media dizinindeki dosya adı. */
    val coverPath: String? = null,
    val createdAt: Long,
    val updatedAt: Long,
    val cloudAssetId: String? = null,
)

data class LocalAssetSummary(
    val asset: LocalAsset,
    val entryCount: Int = 0,
    val photoCount: Int = 0,
    val lastEntryAt: Long? = null,
)

data class LocalEntry(
    val id: String,
    val assetId: String,
    val kind: String = "note",
    val title: String? = null,
    val body: String? = null,
    val occurredAt: Long,
    val dueAt: Long? = null,
    val doneAt: Long? = null,
    val photoPath: String? = null,
    val locationName: String? = null,
    val latitude: Double? = null,
    val longitude: Double? = null,
    val createdAt: Long,
    val updatedAt: Long,
    val cloudEntryId: String? = null,
)

data class LocalReminder(
    val entryId: String,
    val assetId: String,
    val assetTitle: String,
    val title: String? = null,
    val body: String? = null,
    val dueAt: Long,
    val done: Boolean = false,
)

data class LocalCounts(
    val assets: Int = 0,
    val entries: Int = 0,
    val photos: Int = 0,
    val openReminders: Int = 0,
)

data class LocalBackup(
    val file: java.io.File,
    val itemCount: Int,
)

data class LocalImportSummary(
    val assets: Int = 0,
    val entries: Int = 0,
    val photos: Int = 0,
)
