package app.varlikhafizasi.data

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.first

private val Context.sessionDataStore by preferencesDataStore(name = "vh_session")

/** Retrofit istekleri için senkron okunabilen oturum belirteci. */
object TokenHolder {
    @Volatile
    var token: String? = null
}

class SessionStore(private val context: Context) {
    private val tokenKey = stringPreferencesKey("token")

    suspend fun readToken(): String? =
        context.sessionDataStore.data.first()[tokenKey]?.takeIf { it.isNotBlank() }

    suspend fun saveToken(token: String) {
        context.sessionDataStore.edit { it[tokenKey] = token }
        TokenHolder.token = token
    }

    suspend fun clear() {
        context.sessionDataStore.edit { it.remove(tokenKey) }
        TokenHolder.token = null
    }
}
