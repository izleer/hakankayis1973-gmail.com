package app.varlikhafizasi.data

import okhttp3.ResponseBody
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

interface VhApi {
    @POST("v1/auth/login")
    suspend fun login(@Body body: LoginRequest): Envelope<AuthPayload>

    @POST("v1/auth/register")
    suspend fun register(@Body body: RegisterRequest): Envelope<AuthPayload>

    @GET("v1/auth/session")
    suspend fun session(): Envelope<SessionPayload>

    @POST("v1/auth/logout")
    suspend fun logout(): Response<ResponseBody>

    @GET("v1/stats")
    suspend fun stats(): Envelope<Stats>

    @GET("v1/asset-types")
    suspend fun assetTypes(): Envelope<AssetTypesPayload>

    @GET("v1/assets")
    suspend fun assets(
        @Query("q") q: String? = null,
        @Query("limit") limit: Int = 48,
    ): Envelope<AssetPage>

    @GET("v1/assets/discover")
    suspend fun discover(
        @Query("q") q: String? = null,
        @Query("limit") limit: Int = 24,
    ): Envelope<AssetPage>

    @GET("v1/assets/shared")
    suspend fun sharedAssets(
        @Query("q") q: String? = null,
        @Query("friends") friends: String? = null,
        @Query("limit") limit: Int = 48,
    ): Envelope<AssetPage>

    @GET("v1/assets/{id}")
    suspend fun asset(@Path("id") id: String): Envelope<AssetDetail>

    @GET("v1/assets/{id}/measurements")
    suspend fun measurements(@Path("id") id: String): Envelope<MeasurementPage>

    @GET("v1/assets/{id}/entries")
    suspend fun entries(
        @Path("id") id: String,
        @Query("limit") limit: Int = 40,
    ): Envelope<EntryPage>

    @POST("v1/assets")
    suspend fun createAsset(@Body body: CreateAssetRequest): Envelope<AssetPayload>

    @PATCH("v1/assets/{id}")
    suspend fun updateAsset(
        @Path("id") id: String,
        @Body body: UpdateAssetRequest,
    ): Envelope<AssetPayload>

    @POST("v1/assets/{id}/entries")
    suspend fun createEntry(
        @Path("id") id: String,
        @Body body: CreateEntryRequest,
    ): Envelope<EntryPayload>

    @GET("v1/entries/{id}")
    suspend fun entry(@Path("id") id: String): Envelope<EntryPayload>

    @PATCH("v1/entries/{id}")
    suspend fun updateEntry(
        @Path("id") id: String,
        @Body body: UpdateEntryRequest,
    ): Envelope<EntryPayload>

    @DELETE("v1/entries/{id}")
    suspend fun deleteEntry(@Path("id") id: String): Response<ResponseBody>

    @GET("v1/assets/{id}/access")
    suspend fun access(@Path("id") id: String): Envelope<AccessListPayload>

    @POST("v1/assets/{id}/access")
    suspend fun addAccess(
        @Path("id") id: String,
        @Body body: AccessRequest,
    ): Envelope<AccessUserPayload>

    @DELETE("v1/assets/{id}/access/{userId}")
    suspend fun removeAccess(
        @Path("id") id: String,
        @Path("userId") userId: String,
    ): Response<ResponseBody>

    @GET("v1/media")
    suspend fun archive(
        @Query("kind") kind: String? = null,
        @Query("q") q: String? = null,
        @Query("limit") limit: Int = 60,
        @Query("cursor") cursor: String? = null,
    ): Envelope<ArchivePage>

    @POST("v1/media/upload")
    suspend fun upload(@Body body: UploadRequest): Envelope<MediaPayload>

    @GET("v1/feed")
    suspend fun feed(
        @Query("scope") scope: String = "explore",
        @Query("limit") limit: Int = 30,
        @Query("author") author: String? = null,
        @Query("cursor") cursor: String? = null,
    ): Envelope<FeedPage>

    @POST("v1/posts/{id}/like")
    suspend fun like(@Path("id") id: String): Envelope<LikeResult>

    @DELETE("v1/posts/{id}/like")
    suspend fun unlike(@Path("id") id: String): Envelope<LikeResult>

    @GET("v1/notifications")
    suspend fun notifications(@Query("limit") limit: Int = 50): Envelope<NotificationPage>

    @POST("v1/notifications/read-all")
    suspend fun markAllRead(): Envelope<OkResponse>

    @POST("v1/notifications/{id}/read")
    suspend fun markRead(@Path("id") id: String): Envelope<OkResponse>

    @GET("v1/users/{username}")
    suspend fun profile(@Path("username") username: String): Envelope<ProfilePayload>

    @GET("v1/users/suggestions")
    suspend fun suggestions(
        @Query("scope") scope: String? = null,
    ): Envelope<UserListPayload>

    @GET("v1/users/me/friends")
    suspend fun friends(): Envelope<FriendsPayload>

    @GET("v1/users/me/friend-requests")
    suspend fun friendRequests(): Envelope<FriendRequestsPayload>

    @POST("v1/users/{username}/friend")
    suspend fun requestFriend(@Path("username") username: String): Envelope<FriendActionResult>

    @POST("v1/users/{username}/friend/accept")
    suspend fun acceptFriend(@Path("username") username: String): Envelope<FriendActionResult>

    @POST("v1/users/{username}/friend/decline")
    suspend fun declineFriend(@Path("username") username: String): Envelope<FriendActionResult>

    @DELETE("v1/users/{username}/friend")
    suspend fun removeFriend(@Path("username") username: String): Envelope<FriendActionResult>

    @POST("v1/users/{username}/follow")
    suspend fun follow(@Path("username") username: String): Envelope<FollowResult>

    @DELETE("v1/users/{username}/follow")
    suspend fun unfollow(@Path("username") username: String): Envelope<FollowResult>

    @PATCH("v1/me")
    suspend fun updateProfile(@Body body: UpdateProfileRequest): Envelope<UserPayload>

    @GET("v1/social/connections")
    suspend fun socialConnections(): Envelope<SocialConnectionsPayload>

    @GET("v1/social/facebook/start")
    suspend fun socialStart(): Envelope<SocialStartPayload>

    @DELETE("v1/social/connections/{id}")
    suspend fun deleteSocialConnection(@Path("id") id: String): Envelope<OkResponse>

    @POST("v1/social/share")
    suspend fun socialShare(@Body body: SocialShareRequest): Envelope<SocialSharePayload>

    @GET("v1/communities")
    suspend fun communities(
        @Query("mine") mine: String? = null,
        @Query("limit") limit: Int = 48,
    ): Envelope<GroupPage>

    @GET("v1/communities/{slug}")
    suspend fun community(@Path("slug") slug: String): Envelope<GroupDetailPayload>

    @POST("v1/communities/{slug}/join")
    suspend fun joinCommunity(@Path("slug") slug: String): Envelope<GroupJoinResult>

    @DELETE("v1/communities/{slug}/join")
    suspend fun leaveCommunity(@Path("slug") slug: String)

    @GET("v1/communities/{slug}/assets")
    suspend fun groupAssets(@Path("slug") slug: String): Envelope<GroupAssetsPayload>
}

@kotlinx.serialization.Serializable
data class MeasurementPage(val items: List<Measurement> = emptyList())

@kotlinx.serialization.Serializable
data class EntryPage(
    val items: List<Entry> = emptyList(),
    val nextCursor: String? = null,
)

@kotlinx.serialization.Serializable
data class AccessRequest(val username: String)

@kotlinx.serialization.Serializable
data class UserListPayload(val items: List<User> = emptyList())

@kotlinx.serialization.Serializable
data class AccessListPayload(val items: List<AccessViewer> = emptyList())

@kotlinx.serialization.Serializable
data class FollowResult(val following: Boolean = false)
