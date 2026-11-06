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

    suspend fun sharedAssets(query: String? = null, friendsOnly: Boolean = false): AssetPage =
        call {
            api.sharedAssets(
                q = query?.takeIf { it.isNotBlank() },
                friends = if (friendsOnly) "1" else null,
            )
        }

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

    suspend fun friendSuggestions(): List<User> = call { api.suggestions(scope = "friends") }.items

    suspend fun friends(): List<Friend> = call { api.friends() }.items

    suspend fun friendRequests(): FriendRequestsPayload = call { api.friendRequests() }

    suspend fun requestFriend(username: String): String =
        call { api.requestFriend(username.trim()) }.status

    suspend fun acceptFriend(username: String): String =
        call { api.acceptFriend(username.trim()) }.status

    suspend fun declineFriend(username: String) {
        call { api.declineFriend(username.trim()) }
    }

    suspend fun removeFriend(username: String) {
        call { api.removeFriend(username.trim()) }
    }

    suspend fun communities(mine: Boolean = false): GroupPage =
        call { api.communities(mine = if (mine) "true" else null) }

    suspend fun community(slug: String): GroupDetailPayload = call { api.community(slug) }

    suspend fun groupAssets(slug: String): List<Asset> = call { api.groupAssets(slug) }.items

    suspend fun joinGroup(slug: String): GroupJoinResult = call { api.joinCommunity(slug) }

    suspend fun leaveGroup(slug: String) {
        try {
            api.leaveCommunity(slug)
        } catch (error: HttpException) {
            throw error.asVh()
        } catch (error: IOException) {
            throw offline()
        }
    }

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
        viewerIds: List<String> = emptyList(),
        coverUri: Uri?,
        locationName: String? = null,
        latitude: Double? = null,
        longitude: Double? = null,
    ): Asset {
        val cover = coverUri?.let { uploadImage(it) }
        val payload = call {
            api.createAsset(
                CreateAssetRequest(
                    typeId = typeId,
                    title = title.trim(),
                    description = description?.trim()?.takeIf { it.isNotEmpty() },
                    visibility = visibility,
                    viewerIds = viewerIds.takeIf { it.isNotEmpty() },
                    coverMediaId = cover?.id,
                    locationName = locationName?.trim()?.takeIf { it.isNotEmpty() },
                    latitude = latitude,
                    longitude = longitude,
                ),
            )
        }
        return payload.asset
    }

    suspend fun updateAsset(
        assetId: String,
        typeId: String,
        title: String,
        description: String?,
        visibility: String,
        coverUri: Uri?,
        locationName: String?,
        latitude: Double?,
        longitude: Double?,
        clearLocation: Boolean,
        viewerIds: List<String> = emptyList(),
    ): Asset {
        val cover = coverUri?.let { uploadImage(it) }
        val payload = call {
            api.updateAsset(
                assetId,
                UpdateAssetRequest(
                    typeId = typeId,
                    title = title.trim(),
                    // Boş metin açıklamayı sunucuda temizler.
                    description = description?.trim().orEmpty(),
                    visibility = visibility,
                    viewerIds = viewerIds.takeIf { visibility == "selected" && it.isNotEmpty() },
                    coverMediaId = cover?.id,
                    locationName = if (clearLocation) null else locationName?.trim(),
                    latitude = if (clearLocation) null else latitude,
                    longitude = if (clearLocation) null else longitude,
                    clearLocation = clearLocation.takeIf { it },
                ),
            )
        }
        return payload.asset
    }

    suspend fun updateAvatar(uri: Uri?): User {
        val avatarUrl = if (uri != null) {
            uploadImage(uri).url ?: throw VhException(
                AppLanguage.string(context, R.string.error_avatar_upload),
            )
        } else {
            // Boş dize sunucuda avatarı kaldırmak anlamına gelir.
            ""
        }
        return call { api.updateProfile(UpdateProfileRequest(avatarUrl = avatarUrl)) }.user
    }

    suspend fun socialConnections(): SocialConnectionsPayload = call { api.socialConnections() }

    suspend fun socialStartUrl(): String = call { api.socialStart() }.url

    suspend fun disconnectSocial(id: String) {
        call { api.deleteSocialConnection(id) }
    }

    suspend fun shareSocial(
        assetId: String,
        provider: String,
        format: String,
        connectionId: String?,
        caption: String?,
    ): SocialShare = call {
        api.socialShare(
            SocialShareRequest(
                assetId = assetId,
                provider = provider,
                format = format,
                connectionId = connectionId,
                caption = caption?.trim()?.takeIf { it.isNotEmpty() },
            ),
        )
    }.share

    suspend fun addEntry(
        assetId: String,
        type: String,
        title: String?,
        body: String?,
        visibility: String,
        occurredAt: String?,
        mediaUris: List<Uri>,
        measurement: MeasurementInput?,
        locationName: String? = null,
        latitude: Double? = null,
        longitude: Double? = null,
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
                    locationName = locationName?.trim()?.takeIf { it.isNotEmpty() },
                    latitude = latitude,
                    longitude = longitude,
                    mediaIds = mediaIds,
                    measurements = listOfNotNull(measurement),
                ),
            )
        }
        return payload.entry
    }

    suspend fun entry(id: String): Entry = call { api.entry(id) }.entry

    suspend fun updateEntry(
        entryId: String,
        type: String,
        title: String?,
        body: String?,
        visibility: String,
        occurredAt: String?,
        newMediaUris: List<Uri>,
        measurement: MeasurementInput?,
        locationName: String?,
        latitude: Double?,
        longitude: Double?,
        clearLocation: Boolean,
    ): Entry {
        val mediaIds = newMediaUris.map { uploadImage(it).id }
        val payload = call {
            api.updateEntry(
                entryId,
                UpdateEntryRequest(
                    type = type,
                    // Boş metin, alanı sunucuda temizler.
                    title = title?.trim().orEmpty(),
                    body = body?.trim().orEmpty(),
                    visibility = visibility,
                    occurredAt = occurredAt,
                    locationName = if (clearLocation) null else locationName?.trim(),
                    latitude = if (clearLocation) null else latitude,
                    longitude = if (clearLocation) null else longitude,
                    clearLocation = clearLocation.takeIf { it },
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
