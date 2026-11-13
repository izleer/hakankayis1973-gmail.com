package app.varlikhafizasi.data.local

import android.content.Context
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map

private val Context.modeDataStore by preferencesDataStore(name = "vh_mode")

enum class AppMode {
    /** İlk açılış: kullanıcı henüz yerel/bulut seçmedi. */
    UNSET,
    /** Hesapsız, tamamen cihazda çalışan sürüm. */
    LOCAL,
    /** Hesap gerektiren bulut sürümü. */
    CLOUD,
}

/**
 * Yerel/bulut seçimini ve buluta aktarım sırasındaki bekleyen işareti tutar.
 */
class ModeStore(context: Context) {

    private val store = context.applicationContext.modeDataStore

    private val modeKey = stringPreferencesKey("mode")
    private val pendingKey = booleanPreferencesKey("local_migration_pending")

    val mode: Flow<AppMode> = store.data.map { preferences ->
        when (preferences[modeKey]) {
            "local" -> AppMode.LOCAL
            "cloud" -> AppMode.CLOUD
            else -> AppMode.UNSET
        }
    }

    val migrationPending: Flow<Boolean> = store.data.map { it[pendingKey] == true }

    suspend fun readMode(): AppMode = mode.first()

    suspend fun setMode(mode: AppMode) {
        store.edit {
            when (mode) {
                AppMode.LOCAL -> it[modeKey] = "local"
                AppMode.CLOUD -> it[modeKey] = "cloud"
                AppMode.UNSET -> it.remove(modeKey)
            }
        }
    }

    suspend fun readMigrationPending(): Boolean = migrationPending.first()

    suspend fun setMigrationPending(pending: Boolean) {
        store.edit { it[pendingKey] = pending }
    }
}
