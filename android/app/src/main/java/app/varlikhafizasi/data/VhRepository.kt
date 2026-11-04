package app.varlikhafizasi.data

import android.content.Context
import android.net.Uri
import android.provider.OpenableColumns
import android.util.Base64
import app.varlikhafizasi.BuildConfig
import app.varlikhafizasi.R
import com.jakewharton.retrofit2.converter.kotlinx.serialization.asConverterFactory
import kotlinx.serialization.ExperimentalSerializationApi
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.HttpException
import retrofit2.Retrofit
import java.io.IOException
import java.util.concurrent.TimeUnit

class VhException(message: String, val status: Int? = null) : Exception(message)

@OptIn(ExperimentalSerializationApi::class)
class VhRepository(
    private val context: Context,
    private val store: SessionStore,
) {
    private val json = Json {
        ignoreUnknownKeys = true
        explicitNulls = false
        encodeDefaults = false
        isLenient = true
    }

    private val client: OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(20, TimeUnit.SECONDS)
        .readTimeout(60, TimeUnit.SECONDS)
        .writeTimeout(60, TimeUnit.SECONDS)
        .addInterceptor { chain ->
            val token = TokenHolder.token
            val request = chain.request().newBuilder().apply {
                if (!token.isNullOrBlank()) header("Authorization", "Bearer $token")
                header("Accept", "application/json")
                header("Accept-Language", AppLanguage.acceptLanguage(context))
            }.build()
            chain.proceed(request)
        }
        .apply {
            if (BuildConfig.DEBUG) {
                addInterceptor(
                    HttpLoggingInterceptor().apply { level = HttpLoggingInterceptor.Level.BASIC },
                )
            }
        }
        .build()

    private val api: VhApi = Retrofit.Builder()
        .baseUrl(BuildConfig.API_BASE_URL.let { if (it.endsWith("/")) it else "$it/" })
        .client(client)
        .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
        .build()
        .create(VhApi::class.java)

    // -----------------------------------------------------------------------
    // Oturum
    // -----------------------------------------------------------------------

    suspend fun restoreSession(): User? {
        val token = store.readToken()
        if (token.isNullOrBlank()) {
            TokenHolder.token = null
            return null
        }
        TokenHolder.token = token
        return try {
            api.session().data?.user
        } catch (error: HttpException) {
            if (error.code() == 401) {
                store.clear()
                null
            } else {
                throw error.asVh()
            }
        } catch (error: IOException) {
            throw offline()
        }
    }

    suspend fun login(identifier: String, password: String): User {
        val payload = call { api.login(LoginRequest(identifier.trim(), password)) }
        store.saveToken(payload.token)
        return payload.user
    }

    suspend fun register(
        email: String,
        username: String,
        displayName: String,
        password: String,
    ): User {
        val payload = call {
            api.register(
                RegisterRequest(
                    email = email.trim(),
                    username = username.trim().lowercase(),
                    displayName = displayName.trim(),
                    password = password,
                ),
            )
        }
        store.saveToken(payload.token)
        return payload.user
    }

    suspend fun logout() {
        try {
            api.logout()
        } catch (_: Exception) {
            // Sunucuya ulaşılamasa da yerel oturum temizlenir.
        } finally {
            store.clear()
        }
    }

    // -----------------------------------------------------------------------
    // Okuma
    // -----------------------------------------------------------------------

    suspend fun stats(): Stats = call { api.stats() }

    suspend fun assets(query: String? = null): AssetPage =
        call { api.assets(q = query?.takeIf { it.isNotBlank() }) }

    suspend fun discover(query: String? = null): AssetPage =
        call { api.discover(q = query?.takeIf { it.isNotBlank() }) }

    suspend fun assetTypes(): List<AssetType> = call { api.assetTypes() }.items

    suspend fun asset(id: String): AssetDetail = call { api.asset(id) }

    suspend fun measurements(id: String): List<Measurement> = call { api.measurements(id) }.items

    suspend fun entries(id: String): EntryPage = call { api.entries(id) }

    suspend fun archive(kind: String? = null, query: String? = null): ArchivePage =
        call {
            api.archive(
                kind = kind?.takeIf { it.isNotBlank() },
                q = query?.takeIf { it.isNotBlank() },
            )
        }

    suspend fun feed(author: String? = null): FeedPage =
        call { api.feed(scope = "explore", author = author) }

    suspend fun notifications(): NotificationPage = call { api.notifications() }

    suspend fun profile(username: String): ProfilePayload = call { api.profile(username) }

    suspend fun suggestions(): List<User> = call { api.suggestions() }.items

    // -----------------------------------------------------------------------
    // Yazma
    // -----------------------------------------------------------------------

    private suspend fun uploadImage(uri: Uri): Media {
        val resolver = context.contentResolver
        val mimeType = resolver.getType(uri) ?: "image/jpeg"
        val bytes = resolver.openInputStream(uri)?.use { it.readBytes() }
            ?: throw VhException(AppLanguage.string(context, R.string.error_file_unreadable))
        if (bytes.isEmpty()) throw VhException(AppLanguage.string(context, R.string.error_file_empty))
        if (bytes.size > MAX_UPLOAD_BYTES) {
            throw VhException(AppLanguage.string(context, R.string.error_file_too_large))
        }
        val encoded = Base64.encodeToString(bytes, Base64.NO_WRAP)
        return call {
            api.upload(
                UploadRequest(
                    filename = displayName(uri) ?: "foto.jpg",
                    mimeType = mimeType,
                    dataBase64 = encoded,
                ),
            )
        }.media
    }

    suspend fun createAsset(
        typeId: String,
        title: String,
        description: String?,
        visibility: String,
        coverUri: Uri?,
    ): Asset {
        val cover = coverUri?.let { uploadImage(it) }
        val payload = call {
            api.createAsset(
                CreateAssetRequest(
                    typeId = typeId,
                    title = title.trim(),
                    description = description?.trim()?.takeIf { it.isNotEmpty() },
                    visibility = visibility,
                    coverMediaId = cover?.id,
                ),
            )
        }
        return payload.asset
    }

    suspend fun addEntry(
        assetId: String,
        type: String,
        title: String?,
        body: String?,
        visibility: String,
        occurredAt: String?,
        mediaUris: List<Uri>,
        measurement: MeasurementInput?,
    ): Entry {
        val mediaIds = mediaUris.map { uploadImage(it).id }
        val payload = call {
            api.createEntry(
                assetId,
                CreateEntryRequest(
                    type = type,
                    title = title?.trim()?.takeIf { it.isNotEmpty() },
                    body = body?.trim()?.takeIf { it.isNotEmpty() },
                    visibility = visibility,
                    occurredAt = occurredAt,
                    mediaIds = mediaIds,
                    measurements = listOfNotNull(measurement),
                ),
            )
        }
        return payload.entry
    }

    suspend fun deleteEntry(id: String) {
        try {
            val response = api.deleteEntry(id)
            if (!response.isSuccessful) throw HttpException(response)
        } catch (error: HttpException) {
            throw error.asVh()
        } catch (error: IOException) {
            throw offline()
        }
    }

    suspend fun toggleLike(postId: String, currentlyLiked: Boolean): LikeResult =
        call { if (currentlyLiked) api.unlike(postId) else api.like(postId) }

    suspend fun markAllRead() {
        call { api.markAllRead() }
    }

    suspend fun markRead(id: String) {
        call { api.markRead(id) }
    }

    suspend fun addAccess(assetId: String, username: String): UserMini =
        call { api.addAccess(assetId, AccessRequest(username.trim())) }.user

    suspend fun removeAccess(assetId: String, userId: String) {
        try {
            val response = api.removeAccess(assetId, userId)
            if (!response.isSuccessful) throw HttpException(response)
        } catch (error: HttpException) {
            throw error.asVh()
        } catch (error: IOException) {
            throw offline()
        }
    }

    suspend fun follow(username: String) {
        call { api.follow(username) }
    }

    suspend fun unfollow(username: String) {
        call { api.unfollow(username) }
    }

    // -----------------------------------------------------------------------
    // Yardımcılar
    // -----------------------------------------------------------------------

    private suspend fun <T> call(block: suspend () -> Envelope<T>): T =
        try {
            block().data ?: throw VhException(AppLanguage.string(context, R.string.error_no_data))
        } catch (error: HttpException) {
            throw error.asVh()
        } catch (error: IOException) {
            throw offline()
        }

    private fun HttpException.asVh(): VhException {
        val raw = runCatching { response()?.errorBody()?.string() }.getOrNull()
        val parsed = raw?.let {
            runCatching { json.decodeFromString<ApiErrorEnvelope>(it) }.getOrNull()
        }
        val message = parsed?.error?.message
            ?: AppLanguage.string(context, R.string.error_generic_status, code())
        return VhException(message, code())
    }

    private fun offline() = VhException(AppLanguage.string(context, R.string.error_offline))

    private fun displayName(uri: Uri): String? {
        val cursor = context.contentResolver.query(
            uri,
            arrayOf(OpenableColumns.DISPLAY_NAME),
            null,
            null,
            null,
        ) ?: return null
        return cursor.use {
            if (it.moveToFirst()) {
                val index = it.getColumnIndex(OpenableColumns.DISPLAY_NAME)
                if (index >= 0) it.getString(index) else null
            } else {
                null
            }
        }
    }

    companion object {
        private const val MAX_UPLOAD_BYTES = 10 * 1024 * 1024
    }
}

object MediaUrl {
    fun resolve(path: String?): String? {
        if (path.isNullOrBlank()) return null
        if (path.startsWith("http://") || path.startsWith("https://")) return path
        val base = BuildConfig.API_BASE_URL.trimEnd('/')
        return if (path.startsWith("/")) base + path else "$base/$path"
    }
}
