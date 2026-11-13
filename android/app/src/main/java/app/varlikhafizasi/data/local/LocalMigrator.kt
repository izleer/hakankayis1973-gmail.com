package app.varlikhafizasi.data.local

import app.varlikhafizasi.data.AssetType
import app.varlikhafizasi.data.VhRepository
import java.time.Instant

/**
 * Local kayıtlarını, kullanıcı bulut hesabına geçtiğinde kayıpsız aktarır.
 *
 * Kaynak veri silinmez; her kayda sunucu kimliği yazılır. Böylece aktarım
 * yarıda kalsa bile yeniden çalıştırıldığında aynı varlık iki kez oluşmaz.
 */
class LocalMigrator(
    private val repository: VhRepository,
    private val store: LocalStore,
) {

    private val allowedKinds = setOf(
        "note", "photo", "maintenance", "acquisition",
        "measurement", "health", "event", "document", "reminder",
    )

    suspend fun migrate(onProgress: (String) -> Unit = {}): LocalImportSummary {
        val assets = store.assets()
        val entries = store.allEntries()
        val types = flatten(repository.assetTypes())
        var migratedAssets = 0
        var migratedEntries = 0
        var migratedPhotos = 0
        val total = assets.size + entries.size
        var done = 0

        for (asset in assets) {
            val cloudId = asset.cloudAssetId ?: run {
                val type = matchType(types, asset.category)
                val cover = store.mediaFile(asset.coverPath)
                    ?.takeIf { it.exists() }
                    ?.let(store::mediaUri)
                val created = repository.createAsset(
                    typeId = type.id,
                    title = asset.title,
                    description = asset.description,
                    visibility = "private",
                    coverUri = cover,
                )
                store.setCloudAssetId(asset.id, created.id)
                migratedAssets++
                if (cover != null) migratedPhotos++
                created.id
            }
            done++
            onProgress("$done/$total")

            val assetEntries = entries.filter { it.assetId == asset.id }
            for (entry in assetEntries) {
                if (entry.cloudEntryId != null) {
                    done++
                    continue
                }
                val now = System.currentTimeMillis()
                val futureDue = entry.dueAt?.takeIf { it > now }
                val kind = entry.kind
                    .takeIf { it in allowedKinds }
                    ?: "note"
                // Sunucu, hatırlatma zamanını yalnızca "reminder" türünde kabul eder.
                // Local'de herhangi bir kayda hatırlatma eklenebildiği için türü buna göre seç.
                val type = when {
                    futureDue != null -> "reminder"
                    kind == "reminder" -> "note"
                    else -> kind
                }
                val photo = store.mediaFile(entry.photoPath)
                    ?.takeIf { it.exists() }
                    ?.let(store::mediaUri)
                val created = repository.addEntry(
                    assetId = cloudId,
                    type = type,
                    title = entry.title,
                    body = entry.body,
                    visibility = "private",
                    occurredAt = Instant.ofEpochMilli(entry.occurredAt).toString(),
                    dueAt = futureDue?.let { Instant.ofEpochMilli(it).toString() },
                    mediaUris = listOfNotNull(photo),
                    measurement = null,
                    locationName = entry.locationName,
                    latitude = entry.latitude,
                    longitude = entry.longitude,
                )
                store.setCloudEntryId(entry.id, created.id)
                migratedEntries++
                if (photo != null) migratedPhotos++
                if (entry.doneAt != null) {
                    runCatching { repository.setReminderDone(created.id, true) }
                }
                done++
                onProgress("$done/$total")
            }
        }

        return LocalImportSummary(
            assets = migratedAssets,
            entries = migratedEntries,
            photos = migratedPhotos,
        )
    }

    private fun flatten(types: List<AssetType>): List<AssetType> = buildList {
        fun visit(list: List<AssetType>) {
            list.forEach { type ->
                add(type)
                visit(type.children)
            }
        }
        visit(types)
    }

    /**
     * Yerel kategori etiketini sunucu varlık tipine eşler. Eşleşme yoksa
     * kullanıcı verisini kaybetmemek için ilk seçilebilir tip kullanılır.
     */
    private fun matchType(types: List<AssetType>, category: String): AssetType {
        val wanted = category.trim().lowercase()
        val selectable = types.filter { it.isSelectable }
        val pool = selectable.ifEmpty { types }
        return pool.firstOrNull { it.label.lowercase() == wanted }
            ?: pool.firstOrNull {
                wanted.isNotEmpty() &&
                    (it.label.lowercase().contains(wanted) || wanted.contains(it.label.lowercase()))
            }
            ?: pool.firstOrNull()
            ?: throw IllegalStateException("Varlık türü kataloğu boş")
    }
}
