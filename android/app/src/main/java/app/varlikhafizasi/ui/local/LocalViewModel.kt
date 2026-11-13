package app.varlikhafizasi.ui.local

import android.content.Context
import android.net.Uri
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import app.varlikhafizasi.R
import app.varlikhafizasi.data.ReminderItem
import app.varlikhafizasi.data.local.LocalAsset
import app.varlikhafizasi.data.local.LocalAssetSummary
import app.varlikhafizasi.data.local.LocalCounts
import app.varlikhafizasi.data.local.LocalEntry
import app.varlikhafizasi.data.local.LocalExporter
import app.varlikhafizasi.data.local.LocalLimits
import app.varlikhafizasi.data.local.LocalReminder
import app.varlikhafizasi.data.local.LocalStore
import app.varlikhafizasi.reminders.ReminderScheduler
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.File
import java.time.Instant
import java.util.UUID

data class LocalHomeData(
    val summaries: List<LocalAssetSummary> = emptyList(),
    val reminders: List<LocalReminder> = emptyList(),
    val counts: LocalCounts = LocalCounts(),
)

data class LocalHomeUi(
    val loading: Boolean = true,
    val data: LocalHomeData? = null,
    val error: String? = null,
)

data class LocalAssetData(
    val asset: LocalAsset,
    val entries: List<LocalEntry> = emptyList(),
)

data class LocalAssetUi(
    val loading: Boolean = true,
    val data: LocalAssetData? = null,
    val error: String? = null,
)

enum class LocalExportKind { JSON, CSV, ZIP }

/**
 * Tamamen cihazda çalışan yerel modun durumu. Ağ çağrısı yapmaz;
 * bütün işlemler SQLite ve uygulama içi medya dizininde tamamlanır.
 */
class LocalViewModel(
    private val store: LocalStore,
    private val exporter: LocalExporter,
    private val appContext: Context,
) : ViewModel() {

    private val _home = MutableStateFlow(LocalHomeUi())
    val home: StateFlow<LocalHomeUi> = _home.asStateFlow()

    private val _asset = MutableStateFlow(LocalAssetUi())
    val asset: StateFlow<LocalAssetUi> = _asset.asStateFlow()

    private val _notice = MutableStateFlow<String?>(null)
    val notice: StateFlow<String?> = _notice.asStateFlow()

    init {
        refresh()
    }

    fun consumeNotice() {
        _notice.value = null
    }

    /** Ücretsiz plan sınırına ulaşıldığında arayüzden çağrılır. */
    fun notifyAssetLimit() {
        _notice.value = appContext.getString(R.string.local_limit_assets_body)
    }

    fun notifyEntryLimit() {
        _notice.value = appContext.getString(R.string.local_limit_entries_body)
    }

    fun refresh() {
        viewModelScope.launch {
            _home.value = _home.value.copy(loading = true, error = null)
            runCatching {
                LocalHomeData(
                    summaries = store.assetSummaries(),
                    reminders = store.reminders(),
                    counts = store.counts(),
                )
            }.onSuccess { data ->
                _home.value = LocalHomeUi(loading = false, data = data)
                syncReminders(data.reminders)
            }.onFailure { error ->
                _home.value = LocalHomeUi(loading = false, error = error.message ?: "Yerel veri okunamadı")
            }
        }
    }

    fun loadAsset(id: String) {
        viewModelScope.launch {
            _asset.value = LocalAssetUi(loading = true)
            runCatching {
                val asset = store.asset(id) ?: error("Varlık bulunamadı")
                LocalAssetData(asset, store.entries(id))
            }.onSuccess { _asset.value = LocalAssetUi(loading = false, data = it) }
                .onFailure {
                    _asset.value = LocalAssetUi(loading = false, error = it.message ?: "Varlık okunamadı")
                }
        }
    }

    // ------------------------------------------------------------------
    // Medya yardımcıları (kamera/galeri akışları ekranlarda yürür)
    // ------------------------------------------------------------------

    fun newCaptureFile(prefix: String): File = store.newMediaFile(prefix)

    fun captureUri(file: File): Uri = store.mediaUri(file)

    fun mediaFile(path: String?): File? = store.mediaFile(path)

    fun discardFile(file: File?) {
        runCatching { file?.delete() }
    }

    // ------------------------------------------------------------------
    // Varlık ve kayıt yazma
    // ------------------------------------------------------------------

    fun createAsset(
        title: String,
        category: String,
        description: String?,
        coverFile: File?,
        coverUri: Uri?,
        onDone: (String) -> Unit,
    ) {
        if (title.isBlank()) {
            _notice.value = "Varlık adı gerekli"
            return
        }
        viewModelScope.launch {
            runCatching {
                // Ücretsiz plan: en fazla LocalLimits.MAX_ASSETS varlık.
                if (store.counts().assets >= LocalLimits.MAX_ASSETS) {
                    error(appContext.getString(R.string.local_limit_assets_body))
                }
                val path = resolvePhoto(coverFile, coverUri, "kapak")
                val now = System.currentTimeMillis()
                val id = UUID.randomUUID().toString()
                store.upsertAsset(
                    LocalAsset(
                        id = id,
                        title = title.trim(),
                        category = category.trim().ifEmpty { "Diğer" },
                        description = description?.trim()?.takeIf { it.isNotEmpty() },
                        coverPath = path,
                        createdAt = now,
                        updatedAt = now,
                    ),
                )
                id
            }.onSuccess { id ->
                refresh()
                onDone(id)
            }.onFailure { _notice.value = it.message ?: "Varlık kaydedilemedi" }
        }
    }

    fun updateAsset(
        id: String,
        title: String,
        category: String,
        description: String?,
        newCoverFile: File?,
        newCoverUri: Uri?,
        removeCover: Boolean,
        onDone: () -> Unit,
    ) {
        if (title.isBlank()) {
            _notice.value = "Varlık adı gerekli"
            return
        }
        viewModelScope.launch {
            runCatching {
                val existing = store.asset(id) ?: error("Varlık bulunamadı")
                val newPath = resolvePhoto(newCoverFile, newCoverUri, "kapak")
                val coverPath = when {
                    newPath != null -> {
                        existing.coverPath?.let(store::deleteMediaFile)
                        newPath
                    }
                    removeCover -> {
                        existing.coverPath?.let(store::deleteMediaFile)
                        null
                    }
                    else -> existing.coverPath
                }
                store.upsertAsset(
                    existing.copy(
                        title = title.trim(),
                        category = category.trim().ifEmpty { "Diğer" },
                        description = description?.trim()?.takeIf { it.isNotEmpty() },
                        coverPath = coverPath,
                        updatedAt = System.currentTimeMillis(),
                    ),
                )
            }.onSuccess {
                refresh()
                onDone()
            }.onFailure { _notice.value = it.message ?: "Değişiklik kaydedilemedi" }
        }
    }

    fun deleteAsset(id: String, onDone: () -> Unit) {
        viewModelScope.launch {
            runCatching { store.deleteAsset(id) }
                .onSuccess {
                    refresh()
                    onDone()
                }
                .onFailure { _notice.value = it.message ?: "Varlık silinemedi" }
        }
    }

    fun saveEntry(
        entryId: String?,
        assetId: String,
        kind: String,
        title: String?,
        body: String?,
        occurredAt: Long,
        dueAt: Long?,
        newPhotoFile: File?,
        newPhotoUri: Uri?,
        removePhoto: Boolean,
        locationName: String?,
        latitude: Double?,
        longitude: Double?,
        onDone: () -> Unit,
    ) {
        if (title.isNullOrBlank() && body.isNullOrBlank()) {
            _notice.value = "Başlık veya not gerekli"
            return
        }
        if ((latitude == null) != (longitude == null)) {
            _notice.value = "Konum için enlem ve boylam birlikte girilmeli"
            return
        }
        if (dueAt != null && dueAt <= System.currentTimeMillis()) {
            _notice.value = "Hatırlatma zamanı gelecekte olmalı"
            return
        }
        viewModelScope.launch {
            runCatching {
                // Ücretsiz plan: varlık başına en fazla MAX_ENTRIES_PER_ASSET kayıt.
                if (entryId == null && store.entryCount(assetId) >= LocalLimits.MAX_ENTRIES_PER_ASSET) {
                    error(appContext.getString(R.string.local_limit_entries_body))
                }
                val now = System.currentTimeMillis()
                val existing = entryId?.let { store.entry(it) }
                val newPath = resolvePhoto(newPhotoFile, newPhotoUri, "kayit")
                val photoPath = when {
                    newPath != null -> {
                        existing?.photoPath?.let(store::deleteMediaFile)
                        newPath
                    }
                    removePhoto -> {
                        existing?.photoPath?.let(store::deleteMediaFile)
                        null
                    }
                    else -> existing?.photoPath
                }
                store.upsertEntry(
                    LocalEntry(
                        id = existing?.id ?: UUID.randomUUID().toString(),
                        assetId = assetId,
                        kind = kind,
                        title = title?.trim()?.takeIf { it.isNotEmpty() },
                        body = body?.trim()?.takeIf { it.isNotEmpty() },
                        occurredAt = occurredAt,
                        dueAt = dueAt,
                        doneAt = existing?.doneAt,
                        photoPath = photoPath,
                        locationName = locationName?.trim()?.takeIf { it.isNotEmpty() },
                        latitude = latitude,
                        longitude = longitude,
                        createdAt = existing?.createdAt ?: now,
                        updatedAt = now,
                        cloudEntryId = existing?.cloudEntryId,
                    ),
                )
            }.onSuccess {
                refresh()
                loadAsset(assetId)
                onDone()
            }.onFailure { _notice.value = it.message ?: "Kayıt kaydedilemedi" }
        }
    }

    fun deleteEntry(id: String, assetId: String) {
        viewModelScope.launch {
            runCatching { store.deleteEntry(id) }
                .onSuccess {
                    refresh()
                    loadAsset(assetId)
                }
                .onFailure { _notice.value = it.message ?: "Kayıt silinemedi" }
        }
    }

    fun setReminderDone(id: String, done: Boolean) {
        viewModelScope.launch {
            runCatching { store.setReminderDone(id, done) }
                .onSuccess { refresh() }
                .onFailure { _notice.value = it.message ?: "Hatırlatma güncellenemedi" }
        }
    }

    // ------------------------------------------------------------------
    // Dışa aktarma ve temizlik
    // ------------------------------------------------------------------

    suspend fun export(kind: LocalExportKind): File? = withContext(Dispatchers.IO) {
        runCatching {
            when (kind) {
                LocalExportKind.JSON -> exporter.exportJson()
                LocalExportKind.CSV -> exporter.exportCsv()
                LocalExportKind.ZIP -> exporter.exportZip()
            }.file
        }.onFailure { error ->
            withContext(Dispatchers.Main) {
                _notice.value = error.message ?: "Dışa aktarma başarısız"
            }
        }.getOrNull()
    }

    fun deleteAll(onDone: () -> Unit) {
        viewModelScope.launch {
            runCatching {
                store.deleteAll()
                ReminderScheduler.cancelAll(appContext)
            }.onSuccess {
                refresh()
                onDone()
            }.onFailure { _notice.value = it.message ?: "Veriler silinemedi" }
        }
    }

    // ------------------------------------------------------------------

    private suspend fun resolvePhoto(file: File?, uri: Uri?, prefix: String): String? {
        if (file != null) {
            return if (file.exists() && file.length() > 0) file.name else null
        }
        if (uri != null) {
            return store.saveMedia(uri, prefix) ?: error("Fotoğraf okunamadı")
        }
        return null
    }

    private fun syncReminders(reminders: List<LocalReminder>) {
        val items = reminders
            .filter { !it.done }
            .map {
                ReminderItem(
                    id = it.entryId,
                    assetId = it.assetId,
                    assetTitle = it.assetTitle,
                    title = it.title,
                    body = it.body,
                    dueAt = Instant.ofEpochMilli(it.dueAt).toString(),
                )
            }
        runCatching { ReminderScheduler.sync(appContext, items) }
    }

    companion object {
        fun factory(store: LocalStore, exporter: LocalExporter, context: Context) =
            viewModelFactory {
                initializer { LocalViewModel(store, exporter, context.applicationContext) }
            }
    }
}
