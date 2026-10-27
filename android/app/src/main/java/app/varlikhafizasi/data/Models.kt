package app.varlikhafizasi.data

import kotlinx.serialization.Serializable

// ---------------------------------------------------------------------------
// Zarflar
// ---------------------------------------------------------------------------

@Serializable
data class Envelope<T>(val data: T? = null)

@Serializable
data class ApiErrorEnvelope(val error: ApiErrorBody? = null)

@Serializable
data class ApiErrorBody(
    val code: String? = null,
    val message: String? = null,
)

@Serializable
data class OkResponse(val ok: Boolean = true)

// ---------------------------------------------------------------------------
// Kullanıcı
// ---------------------------------------------------------------------------

@Serializable
data class UserMini(
    val id: String,
    val username: String,
    val displayName: String,
    val avatarUrl: String? = null,
)

@Serializable
data class UserStats(
    val assets: Int = 0,
    val entries: Int = 0,
    val posts: Int = 0,
    val followers: Int = 0,
    val following: Int = 0,
)

@Serializable
data class User(
    val id: String,
    val username: String,
    val displayName: String,
    val avatarUrl: String? = null,
    val email: String? = null,
    val bio: String? = null,
    val role: String = "user",
    val interests: List<String> = emptyList(),
    val createdAt: String? = null,
    val onboardedAt: String? = null,
    val stats: UserStats? = null,
    val isSelf: Boolean = false,
    val isFollowing: Boolean = false,
    val isBlocked: Boolean = false,
    val blockedBy: Boolean = false,
)

// ---------------------------------------------------------------------------
// Varlık
// ---------------------------------------------------------------------------

@Serializable
data class AssetTypeRef(
    val id: String,
    val label: String,
    val parentId: String? = null,
    val icon: String? = null,
)

@Serializable
data class AssetType(
    val id: String,
    val parentId: String? = null,
    val label: String,
    val icon: String? = null,
    val sortOrder: Int = 0,
    val children: List<AssetType> = emptyList(),
)

@Serializable
data class Asset(
    val id: String,
    val title: String,
    val description: String? = null,
    val visibility: String = "private",
    val status: String = "active",
    val coverUrl: String? = null,
    val locationName: String? = null,
    val acquiredAt: String? = null,
    val owner: UserMini? = null,
    val type: AssetTypeRef? = null,
    val entryCount: Int = 0,
    val createdAt: String? = null,
    val updatedAt: String? = null,
)

// ---------------------------------------------------------------------------
// Medya ve kayıtlar
// ---------------------------------------------------------------------------

@Serializable
data class Media(
    val id: String,
    val kind: String = "image",
    val status: String = "ready",
    val url: String? = null,
    val mimeType: String = "application/octet-stream",
    val originalName: String? = null,
    val byteSize: Long = 0,
    val width: Int? = null,
    val height: Int? = null,
    val createdAt: String? = null,
)

@Serializable
data class EntryAssetRef(
    val id: String,
    val title: String,
    val typeId: String? = null,
    val typeLabel: String? = null,
)

@Serializable
data class Entry(
    val id: String,
    val assetId: String,
    val type: String = "note",
    val title: String? = null,
    val body: String? = null,
    val occurredAt: String? = null,
    val visibility: String = "private",
    val locationName: String? = null,
    val author: UserMini? = null,
    val media: List<Media> = emptyList(),
    val createdAt: String? = null,
    val updatedAt: String? = null,
    val asset: EntryAssetRef? = null,
)

@Serializable
data class Measurement(
    val id: String,
    val metric: String,
    val value: Double,
    val unit: String,
    val measuredAt: String? = null,
)

// ---------------------------------------------------------------------------
// Sayfalar ve özetler
// ---------------------------------------------------------------------------

@Serializable
data class AssetPage(
    val items: List<Asset> = emptyList(),
    val page: Int = 1,
    val pageSize: Int = 12,
    val total: Int = 0,
)

@Serializable
data class Stats(
    val assets: Int = 0,
    val archivedAssets: Int = 0,
    val publicAssets: Int = 0,
    val entries: Int = 0,
    val media: Int = 0,
    val images: Int = 0,
    val documents: Int = 0,
    val videos: Int = 0,
    val sharedWithMe: Int = 0,
    val followers: Int = 0,
    val following: Int = 0,
    val recentEntries: List<Entry> = emptyList(),
)

@Serializable
data class ArchiveAssetRef(
    val id: String,
    val title: String,
    val typeId: String? = null,
    val typeLabel: String? = null,
)

@Serializable
data class ArchiveEntryRef(
    val id: String,
    val title: String? = null,
    val occurredAt: String? = null,
)

@Serializable
data class ArchiveItem(
    val id: String,
    val kind: String = "image",
    val status: String = "ready",
    val url: String? = null,
    val mimeType: String = "application/octet-stream",
    val originalName: String? = null,
    val byteSize: Long = 0,
    val createdAt: String? = null,
    val asset: ArchiveAssetRef? = null,
    val entry: ArchiveEntryRef? = null,
)

@Serializable
data class ArchiveCounts(
    val total: Int = 0,
    val images: Int = 0,
    val documents: Int = 0,
    val videos: Int = 0,
)

@Serializable
data class ArchivePage(
    val items: List<ArchiveItem> = emptyList(),
    val counts: ArchiveCounts = ArchiveCounts(),
    val nextCursor: String? = null,
)

@Serializable
data class AccessViewer(
    val user: UserMini,
    val grantedAt: String? = null,
)

@Serializable
data class AssetAccess(
    val isOwner: Boolean = false,
    val isShared: Boolean = false,
    val viewers: List<AccessViewer> = emptyList(),
)

@Serializable
data class Ownership(
    val id: String,
    val owner: UserMini,
    val status: String = "active",
    val startedAt: String? = null,
    val endedAt: String? = null,
    val note: String? = null,
)

@Serializable
data class AssetDetail(
    val asset: Asset,
    val entries: List<Entry> = emptyList(),
    val entriesNextCursor: String? = null,
    val ownerships: List<Ownership> = emptyList(),
    val access: AssetAccess = AssetAccess(),
)

// ---------------------------------------------------------------------------
// Sosyal
// ---------------------------------------------------------------------------

@Serializable
data class FeedAssetRef(
    val id: String,
    val title: String,
    val coverUrl: String? = null,
    val visibility: String = "public",
    val typeLabel: String? = null,
)

@Serializable
data class FeedEntryRef(
    val id: String,
    val title: String? = null,
    val type: String = "note",
    val occurredAt: String? = null,
)

@Serializable
data class FeedCommunityRef(
    val id: String,
    val slug: String,
    val name: String,
)

@Serializable
data class FeedPost(
    val id: String,
    val body: String = "",
    val audience: String = "public",
    val createdAt: String? = null,
    val author: UserMini,
    val asset: FeedAssetRef? = null,
    val entry: FeedEntryRef? = null,
    val community: FeedCommunityRef? = null,
    val likeCount: Int = 0,
    val commentCount: Int = 0,
    val likedByMe: Boolean = false,
    val media: List<Media> = emptyList(),
)

@Serializable
data class FeedPage(
    val items: List<FeedPost> = emptyList(),
    val nextCursor: String? = null,
)

@Serializable
data class LikeResult(val liked: Boolean = false, val likeCount: Int = 0)

@Serializable
data class VhNotification(
    val id: String,
    val type: String = "system",
    val entityType: String? = null,
    val entityId: String? = null,
    val message: String? = null,
    val readAt: String? = null,
    val createdAt: String? = null,
    val actor: UserMini? = null,
)

@Serializable
data class NotificationPage(
    val items: List<VhNotification> = emptyList(),
    val unreadCount: Int = 0,
    val nextCursor: String? = null,
)

@Serializable
data class ProfilePayload(
    val user: User,
    val assets: List<Asset> = emptyList(),
)

// ---------------------------------------------------------------------------
// İstek gövdeleri
// ---------------------------------------------------------------------------

@Serializable
data class LoginRequest(val identifier: String, val password: String)

@Serializable
data class RegisterRequest(
    val email: String,
    val username: String,
    val displayName: String,
    val password: String,
)

@Serializable
data class AuthPayload(
    val token: String,
    val expiresAt: String? = null,
    val user: User,
)

@Serializable
data class SessionPayload(val user: User)

@Serializable
data class UploadRequest(
    val filename: String? = null,
    val mimeType: String,
    val dataBase64: String,
    val assetId: String? = null,
    val entryId: String? = null,
)

@Serializable
data class MediaPayload(val media: Media)

@Serializable
data class AssetPayload(val asset: Asset)

@Serializable
data class AssetTypesPayload(val items: List<AssetType> = emptyList())

@Serializable
data class AccessUserPayload(val user: UserMini)

@Serializable
data class EntryPayload(val entry: Entry)

@Serializable
data class CreateAssetRequest(
    val typeId: String,
    val title: String,
    val description: String? = null,
    val visibility: String = "private",
    val coverMediaId: String? = null,
)

@Serializable
data class MeasurementInput(
    val metric: String,
    val value: Double,
    val unit: String,
)

@Serializable
data class CreateEntryRequest(
    val type: String,
    val title: String? = null,
    val body: String? = null,
    val visibility: String,
    val mediaIds: List<String> = emptyList(),
    val measurements: List<MeasurementInput> = emptyList(),
)
