package app.varlikhafizasi.data

import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonObject

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
    val friends: Int = 0,
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
    val friendStatus: String? = null,
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
    val isSelectable: Boolean = false,
    val attributesSchema: CategoryTemplate = CategoryTemplate(),
    val children: List<AssetType> = emptyList(),
)

// ---------------------------------------------------------------------------
// Kategori şablonu — generic varlık modelinin üzerine binen konfigürasyon
// ---------------------------------------------------------------------------

@Serializable
data class TemplateField(
    val key: String,
    val label: String,
    val type: String = "text",
    val unit: String? = null,
    val options: List<String> = emptyList(),
)

@Serializable
data class TemplateAction(
    val key: String,
    val label: String,
    val entryType: String = "event",
    val reminderDays: Int? = null,
)

@Serializable
data class TemplateMeasurement(
    val key: String,
    val label: String,
    val unit: String = "",
)

@Serializable
data class TemplateReminder(
    val key: String,
    val label: String,
    val intervalDays: Int = 0,
)

@Serializable
data class CategoryTemplate(
    val fields: List<TemplateField> = emptyList(),
    val actions: List<TemplateAction> = emptyList(),
    val measurements: List<TemplateMeasurement> = emptyList(),
    val reminders: List<TemplateReminder> = emptyList(),
)

@Serializable
data class CustomField(
    val key: String = "",
    val label: String = "",
    val type: String = "text",
    val value: String? = null,
)

@Serializable
data class AssetManagerRef(
    val id: String,
    val slug: String,
    val name: String,
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
    val latitude: Double? = null,
    val longitude: Double? = null,
    val acquiredAt: String? = null,
    val attributes: JsonObject = JsonObject(emptyMap()),
    val customFields: List<CustomField> = emptyList(),
    val template: CategoryTemplate = CategoryTemplate(),
    val owner: UserMini? = null,
    val type: AssetTypeRef? = null,
    val entryCount: Int = 0,
    val createdAt: String? = null,
    val updatedAt: String? = null,
    val relation: String? = null,
    val sharedAt: String? = null,
    val isFriend: Boolean = false,
    val manager: AssetManagerRef? = null,
    // Grup varlık listesinde paylaşım satırları için.
    val shareId: String? = null,
    val scope: String? = null,
    val addedBy: UserMini? = null,
    val managed: Boolean = false,
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
    val dueAt: String? = null,
    val reminderDoneAt: String? = null,
    val visibility: String = "private",
    val locationName: String? = null,
    val latitude: Double? = null,
    val longitude: Double? = null,
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

@Serializable
data class ReminderItem(
    val id: String,
    val assetId: String,
    val assetTitle: String = "",
    val title: String? = null,
    val body: String? = null,
    val dueAt: String? = null,
    val doneAt: String? = null,
)

@Serializable
data class ReminderPage(val items: List<ReminderItem> = emptyList())

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
    val friends: Int = 0,
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
    val isManager: Boolean = false,
    val canEdit: Boolean = false,
    val isShared: Boolean = false,
    val manager: AssetManagerRef? = null,
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
data class CreatePostRequest(
    val body: String = "",
    // Varsayılan bırakılırsa encodeDefaults=false nedeniyle alan isteğe
    // eklenmiyor ve API gönderiyi herkese açık sanıyor.
    val audience: String,
    val communityId: String? = null,
    val assetId: String? = null,
    val entryId: String? = null,
    val mediaIds: List<String>? = null,
)

@Serializable
data class PostPayload(val post: FeedPost)

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
// Arkadaşlık
// ---------------------------------------------------------------------------

@Serializable
data class Friend(
    val id: String,
    val username: String,
    val displayName: String,
    val avatarUrl: String? = null,
    val since: String? = null,
)

@Serializable
data class FriendRequest(
    val user: UserMini,
    val requestedAt: String? = null,
)

@Serializable
data class FriendsPayload(val items: List<Friend> = emptyList())

@Serializable
data class FriendRequestsPayload(
    val incoming: List<FriendRequest> = emptyList(),
    val outgoing: List<FriendRequest> = emptyList(),
)

@Serializable
data class FriendActionResult(val status: String = "none")

// ---------------------------------------------------------------------------
// Sosyal paylaşım
// ---------------------------------------------------------------------------

@Serializable
data class SocialConfig(
    val configured: Boolean = false,
    val missing: List<String> = emptyList(),
    val graphVersion: String = "",
    val redirectUri: String = "",
    val webReturnUrl: String = "",
    val mediaPublicReady: Boolean = false,
    val instagramReady: Boolean = false,
)

@Serializable
data class SocialConnection(
    val id: String,
    val provider: String,
    val externalId: String = "",
    val accountName: String,
    val accountUsername: String? = null,
    val pageId: String = "",
    val pageName: String = "",
    val createdAt: String? = null,
)

@Serializable
data class SocialConnectionsPayload(
    val config: SocialConfig = SocialConfig(),
    val items: List<SocialConnection> = emptyList(),
)

@Serializable
data class SocialStartPayload(
    val url: String,
    val redirectUri: String? = null,
    val expiresIn: Int = 0,
)

@Serializable
data class SocialShare(
    val id: String,
    val assetId: String? = null,
    val provider: String = "facebook",
    val format: String = "post",
    val status: String = "pending",
    val caption: String? = null,
    val permalink: String? = null,
    val externalId: String? = null,
    val error: String? = null,
    val createdAt: String? = null,
    val publishedAt: String? = null,
)

@Serializable
data class SocialSharePayload(val share: SocialShare)

@Serializable
data class UserPayload(val user: User)

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
data class UpdateProfileRequest(val avatarUrl: String? = null)

@Serializable
data class SocialShareRequest(
    val assetId: String,
    val provider: String,
    val format: String,
    val connectionId: String? = null,
    val caption: String? = null,
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

// ---------------------------------------------------------------------------
// Topluluklar
// ---------------------------------------------------------------------------

@Serializable
data class Group(
    val id: String,
    val slug: String,
    val name: String,
    val description: String? = null,
    val category: String? = null,
    val rules: String? = null,
    val visibility: String = "public",
    val joinPolicy: String = "open",
    val coverUrl: String? = null,
    val memberCount: Int = 0,
    val postCount: Int = 0,
    val assetCount: Int = 0,
    val role: String? = null,
    val membershipStatus: String? = null,
    val owner: UserMini? = null,
    val createdAt: String? = null,
)

@Serializable
data class GroupPage(
    val items: List<Group> = emptyList(),
    val total: Int = 0,
)

/** Paneldeki grup özeti; sayaçlar üyenin son grup ziyaretinden sonrasını sayar. */
@Serializable
data class GroupSummary(
    val id: String,
    val slug: String,
    val name: String,
    val coverUrl: String? = null,
    val memberCount: Int = 0,
    val lastSeenAt: String? = null,
    val unreadPosts: Int = 0,
    val addedAssets: Int = 0,
    val removedAssets: Int = 0,
)

@Serializable
data class GroupSummaryPayload(
    val items: List<GroupSummary> = emptyList(),
    val total: Int = 0,
)

@Serializable
data class GroupSeenPayload(val seenAt: String? = null)

@Serializable
data class GroupMember(
    val user: UserMini,
    val role: String = "member",
    val joinedAt: String? = null,
)

@Serializable
data class GroupDetailPayload(
    val community: Group,
    val members: List<GroupMember> = emptyList(),
    val isMember: Boolean = false,
    val isOwner: Boolean = false,
    val canPost: Boolean = false,
    val canManage: Boolean = false,
    val membershipStatus: String? = null,
)

@Serializable
data class GroupAssetsPayload(val items: List<Asset> = emptyList())

@Serializable
data class GroupAssetShareRequest(
    val assetId: String,
    val scope: String = "summary",
)

@Serializable
data class GroupAssetScopeRequest(val scope: String)

@Serializable
data class GroupAssetShare(
    val id: String? = null,
    val scope: String = "summary",
    val sharedAt: String? = null,
    val managed: Boolean = false,
)

@Serializable
data class GroupAssetSharePayload(val share: GroupAssetShare)

@Serializable
data class GroupAssetDetailPayload(
    val asset: Asset,
    val share: GroupAssetShare? = null,
    val community: FeedCommunityRef,
    val entries: List<Entry> = emptyList(),
)

@Serializable
data class GroupJoinResult(
    val joined: Boolean = false,
    val pending: Boolean = false,
)

@Serializable
data class CreateGroupRequest(
    val name: String,
    val description: String? = null,
    val category: String? = null,
    val rules: String? = null,
    val visibility: String = "public",
    val joinPolicy: String = "open",
    val coverUrl: String? = null,
)

@Serializable
data class GroupCreatePayload(val community: Group)

@Serializable
data class InviteMemberRequest(val username: String)

@Serializable
data class GroupInvitation(
    val id: String,
    val invitee: UserMini? = null,
    val createdAt: String? = null,
)

@Serializable
data class GroupInvitePayload(val invitation: GroupInvitation)

@Serializable
data class CreateAssetRequest(
    val typeId: String,
    val title: String,
    val description: String? = null,
    val visibility: String = "private",
    val viewerIds: List<String>? = null,
    val coverMediaId: String? = null,
    val locationName: String? = null,
    val latitude: Double? = null,
    val longitude: Double? = null,
    val acquiredAt: String? = null,
    val attributes: Map<String, String> = emptyMap(),
    val customFields: List<CustomField> = emptyList(),
)

/**
 * PATCH /v1/assets/:id gövdesi. Konumu kaldırmak için [clearLocation] gönderilir;
 * null alanlar istemcide düşürüldüğü için ayrı bayrak gerekir.
 */
@Serializable
data class UpdateAssetRequest(
    val typeId: String? = null,
    val title: String? = null,
    val description: String? = null,
    val visibility: String? = null,
    val viewerIds: List<String>? = null,
    val coverMediaId: String? = null,
    val locationName: String? = null,
    val latitude: Double? = null,
    val longitude: Double? = null,
    val clearLocation: Boolean? = null,
    val acquiredAt: String? = null,
    val attributes: Map<String, String>? = null,
    val customFields: List<CustomField>? = null,
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
    val occurredAt: String? = null,
    val dueAt: String? = null,
    val locationName: String? = null,
    val latitude: Double? = null,
    val longitude: Double? = null,
    val mediaIds: List<String> = emptyList(),
    val measurements: List<MeasurementInput> = emptyList(),
)

/**
 * PATCH /v1/entries/:id gövdesi. Boş metinler başlığı/notu temizler;
 * konumu kaldırmak için [clearLocation] gönderilir.
 */
@Serializable
data class UpdateEntryRequest(
    val type: String? = null,
    val title: String? = null,
    val body: String? = null,
    val visibility: String? = null,
    val occurredAt: String? = null,
    val dueAt: String? = null,
    val reminderDone: Boolean? = null,
    val locationName: String? = null,
    val latitude: Double? = null,
    val longitude: Double? = null,
    val clearLocation: Boolean? = null,
    val mediaIds: List<String> = emptyList(),
    val measurements: List<MeasurementInput> = emptyList(),
)
