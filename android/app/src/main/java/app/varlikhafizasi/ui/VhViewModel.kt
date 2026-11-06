package app.varlikhafizasi.ui

import android.content.Context
import android.net.Uri
import androidx.annotation.StringRes
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import app.varlikhafizasi.R
import app.varlikhafizasi.data.AppLanguage
import app.varlikhafizasi.data.AccessViewer
import app.varlikhafizasi.data.ArchivePage
import app.varlikhafizasi.data.Asset
import app.varlikhafizasi.data.AssetDetail
import app.varlikhafizasi.data.AssetType
import app.varlikhafizasi.data.Entry
import app.varlikhafizasi.data.FeedPost
import app.varlikhafizasi.data.Friend
import app.varlikhafizasi.data.FriendRequest
import app.varlikhafizasi.data.Group
import app.varlikhafizasi.data.GroupDetailPayload
import app.varlikhafizasi.data.Measurement
import app.varlikhafizasi.data.MeasurementInput
import app.varlikhafizasi.data.NotificationPage
import app.varlikhafizasi.data.ProfilePayload
import app.varlikhafizasi.data.SocialConnectionsPayload
import app.varlikhafizasi.data.Stats
import app.varlikhafizasi.data.User
import app.varlikhafizasi.data.UserMini
import app.varlikhafizasi.data.VhException
import app.varlikhafizasi.data.VhRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class Loadable<T>(
    val loading: Boolean = false,
    val data: T? = null,
    val error: String? = null,
)

data class SessionUi(
    val checking: Boolean = true,
    val user: User? = null,
    val error: String? = null,
)

data class HomeData(
    val stats: Stats,
    val assets: List<Asset>,
)

data class DetailData(
    val detail: AssetDetail,
    val measurements: List<Measurement>,
)

data class ExploreData(
    val posts: List<FeedPost>,
    val people: List<User>,
    val publicAssets: List<Asset>,
)

data class ProfileData(
    val payload: ProfilePayload,
    val posts: List<FeedPost>,
)

data class GroupsData(
    val mine: List<Group>,
    val discover: List<Group>,
)

data class GroupDetailData(
    val payload: GroupDetailPayload,
    val assets: List<Asset>,
)

data class FriendsData(
    val friends: List<Friend>,
    val incoming: List<FriendRequest>,
    val outgoing: List<FriendRequest>,
    val suggestions: List<User>,
    val shared: List<Asset>,
)

class VhViewModel(
    private val repository: VhRepository,
    private val appContext: Context,
) : ViewModel() {

    private fun str(@StringRes id: Int, vararg args: Any): String =
        AppLanguage.string(appContext, id, *args)

    private val _session = MutableStateFlow(SessionUi())
    val session: StateFlow<SessionUi> = _session.asStateFlow()

    private val _authBusy = MutableStateFlow(false)
    val authBusy: StateFlow<Boolean> = _authBusy.asStateFlow()

    private val _authError = MutableStateFlow<String?>(null)
    val authError: StateFlow<String?> = _authError.asStateFlow()

    private val _home = MutableStateFlow(Loadable<HomeData>())
    val home: StateFlow<Loadable<HomeData>> = _home.asStateFlow()

    private val _assets = MutableStateFlow(Loadable<List<Asset>>())
    val assets: StateFlow<Loadable<List<Asset>>> = _assets.asStateFlow()

    private val _assetTypes = MutableStateFlow<List<AssetType>>(emptyList())
    val assetTypes: StateFlow<List<AssetType>> = _assetTypes.asStateFlow()

    private val _detail = MutableStateFlow(Loadable<DetailData>())
    val detail: StateFlow<Loadable<DetailData>> = _detail.asStateFlow()

    private val _entryDraft = MutableStateFlow(Loadable<Entry>())
    val entryDraft: StateFlow<Loadable<Entry>> = _entryDraft.asStateFlow()

    private val _assetDraft = MutableStateFlow(Loadable<Asset>())
    val assetDraft: StateFlow<Loadable<Asset>> = _assetDraft.asStateFlow()

    private val _assetViewers = MutableStateFlow<List<AccessViewer>>(emptyList())
    val assetViewers: StateFlow<List<AccessViewer>> = _assetViewers.asStateFlow()

    private val _pickerFriends = MutableStateFlow(Loadable<List<Friend>>())
    val pickerFriends: StateFlow<Loadable<List<Friend>>> = _pickerFriends.asStateFlow()

    private val _archive = MutableStateFlow(Loadable<ArchivePage>())
    val archive: StateFlow<Loadable<ArchivePage>> = _archive.asStateFlow()

    private val _explore = MutableStateFlow(Loadable<ExploreData>())
    val explore: StateFlow<Loadable<ExploreData>> = _explore.asStateFlow()

    private val _notifications = MutableStateFlow(Loadable<NotificationPage>())
    val notifications: StateFlow<Loadable<NotificationPage>> = _notifications.asStateFlow()

    private val _profile = MutableStateFlow(Loadable<ProfileData>())
    val profile: StateFlow<Loadable<ProfileData>> = _profile.asStateFlow()

    private val _social = MutableStateFlow(Loadable<SocialConnectionsPayload>())
    val social: StateFlow<Loadable<SocialConnectionsPayload>> = _social.asStateFlow()

    private val _groups = MutableStateFlow(Loadable<GroupsData>())
    val groups: StateFlow<Loadable<GroupsData>> = _groups.asStateFlow()

    private val _group = MutableStateFlow(Loadable<GroupDetailData>())
    val group: StateFlow<Loadable<GroupDetailData>> = _group.asStateFlow()

    private val _friends = MutableStateFlow(Loadable<FriendsData>())
    val friends: StateFlow<Loadable<FriendsData>> = _friends.asStateFlow()

    private val _friendsBusy = MutableStateFlow(false)
    val friendsBusy: StateFlow<Boolean> = _friendsBusy.asStateFlow()

    private val _groupBusy = MutableStateFlow(false)
    val groupBusy: StateFlow<Boolean> = _groupBusy.asStateFlow()

    private val _socialBusy = MutableStateFlow(false)
    val socialBusy: StateFlow<Boolean> = _socialBusy.asStateFlow()

    private val _socialError = MutableStateFlow<String?>(null)
    val socialError: StateFlow<String?> = _socialError.asStateFlow()

    private val _avatarBusy = MutableStateFlow(false)
    val avatarBusy: StateFlow<Boolean> = _avatarBusy.asStateFlow()

    private val _formBusy = MutableStateFlow(false)
    val formBusy: StateFlow<Boolean> = _formBusy.asStateFlow()

    private val _formError = MutableStateFlow<String?>(null)
    val formError: StateFlow<String?> = _formError.asStateFlow()

    private val _notice = MutableStateFlow<String?>(null)
    val notice: StateFlow<String?> = _notice.asStateFlow()

    init {
        restore()
    }

    // -----------------------------------------------------------------------
    // Oturum
    // -----------------------------------------------------------------------

    private fun restore() {
        viewModelScope.launch {
            _session.value = SessionUi(checking = true)
            try {
                val user = repository.restoreSession()
                _session.value = SessionUi(checking = false, user = user)
            } catch (error: Throwable) {
                _session.value = SessionUi(checking = false, error = messageOf(error))
            }
        }
    }

    fun retrySession() = restore()

    fun login(identifier: String, password: String) {
        if (identifier.isBlank() || password.isBlank()) {
            _authError.value = str(R.string.error_fields_required)
            return
        }
        viewModelScope.launch {
            _authBusy.value = true
            _authError.value = null
            try {
                val user = repository.login(identifier, password)
                _session.value = SessionUi(checking = false, user = user)
                loadHome()
            } catch (error: Throwable) {
                _authError.value = messageOf(error)
            } finally {
                _authBusy.value = false
            }
        }
    }

    fun register(email: String, username: String, displayName: String, password: String) {
        if (listOf(email, username, displayName, password).any { it.isBlank() }) {
            _authError.value = str(R.string.error_fill_all)
            return
        }
        if (password.length < 8) {
            _authError.value = str(R.string.error_password_short)
            return
        }
        viewModelScope.launch {
            _authBusy.value = true
            _authError.value = null
            try {
                val user = repository.register(email, username, displayName, password)
                _session.value = SessionUi(checking = false, user = user)
                loadHome()
            } catch (error: Throwable) {
                _authError.value = messageOf(error)
            } finally {
                _authBusy.value = false
            }
        }
    }

    fun logout() {
        viewModelScope.launch {
            repository.logout()
            _session.value = SessionUi(checking = false, user = null)
            _home.value = Loadable()
            _assets.value = Loadable()
            _detail.value = Loadable()
            _entryDraft.value = Loadable()
            _assetDraft.value = Loadable()
            _assetViewers.value = emptyList()
            _pickerFriends.value = Loadable()
            _archive.value = Loadable()
            _explore.value = Loadable()
            _notifications.value = Loadable()
            _profile.value = Loadable()
            _social.value = Loadable()
            _groups.value = Loadable()
            _group.value = Loadable()
            _friends.value = Loadable()
            _friendsBusy.value = false
        }
    }

    fun clearAuthError() {
        _authError.value = null
    }

    // -----------------------------------------------------------------------
    // Okuma
    // -----------------------------------------------------------------------

    fun loadHome(showSpinner: Boolean = true) {
        viewModelScope.launch {
            if (showSpinner) _home.update { it.copy(loading = true, error = null) }
            try {
                val stats = repository.stats()
                val assets = repository.assets().items
                _home.value = Loadable(data = HomeData(stats, assets))
            } catch (error: Throwable) {
                _home.value = Loadable(error = messageOf(error))
            }
        }
    }

    fun loadAssets(query: String? = null) {
        viewModelScope.launch {
            _assets.value = Loadable(loading = true)
            try {
                _assets.value = Loadable(data = repository.assets(query).items)
            } catch (error: Throwable) {
                _assets.value = Loadable(error = messageOf(error))
            }
        }
    }

    fun ensureAssetTypes() {
        if (_assetTypes.value.isNotEmpty()) return
        viewModelScope.launch {
            runCatching { repository.assetTypes() }
                .onSuccess { _assetTypes.value = it }
                .onFailure { _formError.value = messageOf(it) }
        }
    }

    fun loadDetail(id: String) {
        viewModelScope.launch {
            _detail.value = Loadable(loading = true)
            try {
                val detail = repository.asset(id)
                val measurements = runCatching { repository.measurements(id) }.getOrDefault(emptyList())
                _detail.value = Loadable(data = DetailData(detail, measurements))
            } catch (error: Throwable) {
                _detail.value = Loadable(error = messageOf(error))
            }
        }
    }

    /** Düzenleme ekranının ön dolgusu için tek kaydı getirir. */
    fun loadEntry(id: String) {
        viewModelScope.launch {
            _entryDraft.value = Loadable(loading = true)
            try {
                _entryDraft.value = Loadable(data = repository.entry(id))
            } catch (error: Throwable) {
                _entryDraft.value = Loadable(error = messageOf(error))
            }
        }
    }

    fun clearEntryDraft() {
        _entryDraft.value = Loadable()
    }

    /** Varlık düzenleme ekranının ön dolgusu için tek varlığı getirir. */
    fun loadAssetDraft(id: String) {
        viewModelScope.launch {
            _assetDraft.value = Loadable(loading = true)
            _assetViewers.value = emptyList()
            try {
                val detail = repository.asset(id)
                _assetViewers.value = detail.access.viewers
                _assetDraft.value = Loadable(data = detail.asset)
            } catch (error: Throwable) {
                _assetViewers.value = emptyList()
                _assetDraft.value = Loadable(error = messageOf(error))
            }
        }
    }

    fun clearAssetDraft() {
        _assetDraft.value = Loadable()
        _assetViewers.value = emptyList()
    }

    /** Görünürlük "seçili kişiler" iken kullanılacak arkadaş listesini getirir. */
    fun loadPickerFriends() {
        if (_pickerFriends.value.loading || _pickerFriends.value.data != null) return
        viewModelScope.launch {
            _pickerFriends.value = Loadable(loading = true)
            try {
                _pickerFriends.value = Loadable(data = repository.friends())
            } catch (error: Throwable) {
                _pickerFriends.value = Loadable(error = messageOf(error))
            }
        }
    }

    fun loadArchive(kind: String? = null, query: String? = null) {
        viewModelScope.launch {
            _archive.value = Loadable(loading = true)
            try {
                _archive.value = Loadable(data = repository.archive(kind, query))
            } catch (error: Throwable) {
                _archive.value = Loadable(error = messageOf(error))
            }
        }
    }

    fun loadExplore() {
        viewModelScope.launch {
            _explore.value = Loadable(loading = true)
            try {
                val posts = repository.feed().items
                val people = runCatching { repository.suggestions() }.getOrDefault(emptyList())
                val publicAssets = runCatching { repository.discover().items }.getOrDefault(emptyList())
                _explore.value = Loadable(data = ExploreData(posts, people, publicAssets))
            } catch (error: Throwable) {
                _explore.value = Loadable(error = messageOf(error))
            }
        }
    }

    fun loadFriends(
        query: String? = null,
        friendsOnly: Boolean = false,
        showSpinner: Boolean = true,
    ) {
        viewModelScope.launch {
            if (showSpinner) {
                _friends.value = _friends.value.copy(loading = true, error = null)
            }
            try {
                val friends = repository.friends()
                val requests = repository.friendRequests()
                val suggestions = runCatching { repository.friendSuggestions() }
                    .getOrDefault(emptyList())
                val shared = runCatching { repository.sharedAssets(query, friendsOnly).items }
                    .getOrDefault(emptyList())
                _friends.value = Loadable(
                    data = FriendsData(
                        friends = friends,
                        incoming = requests.incoming,
                        outgoing = requests.outgoing,
                        suggestions = suggestions,
                        shared = shared,
                    ),
                )
            } catch (error: Throwable) {
                if (_friends.value.data == null) {
                    _friends.value = Loadable(error = messageOf(error))
                } else {
                    _notice.value = messageOf(error)
                }
            }
        }
    }

    fun loadNotifications() {
        viewModelScope.launch {
            _notifications.value = Loadable(loading = true)
            try {
                _notifications.value = Loadable(data = repository.notifications())
            } catch (error: Throwable) {
                _notifications.value = Loadable(error = messageOf(error))
            }
        }
    }

    fun loadProfile(username: String? = null) {
        val name = username ?: _session.value.user?.username ?: return
        viewModelScope.launch {
            _profile.value = Loadable(loading = true)
            try {
                val payload = repository.profile(name)
                val posts = runCatching { repository.feed(author = name) }.getOrNull()?.items.orEmpty()
                _profile.value = Loadable(data = ProfileData(payload, posts))
            } catch (error: Throwable) {
                _profile.value = Loadable(error = messageOf(error))
            }
        }
    }

    fun loadAllForSession() {
        loadHome()
        loadAssets()
        loadArchive()
        loadNotifications()
    }

    fun loadSocial(showSpinner: Boolean = true) {
        viewModelScope.launch {
            if (showSpinner && _social.value.data == null) {
                _social.value = _social.value.copy(loading = true)
            }
            try {
                _social.value = Loadable(data = repository.socialConnections())
            } catch (error: Throwable) {
                if (_social.value.data == null) {
                    _social.value = Loadable(error = messageOf(error))
                }
            }
        }
    }

    fun loadGroups(showSpinner: Boolean = true) {
        viewModelScope.launch {
            if (showSpinner && _groups.value.data == null) {
                _groups.value = _groups.value.copy(loading = true, error = null)
            }
            try {
                val mine = repository.communities(mine = true).items
                val discover = repository.communities().items
                val mineIds = mine.map { it.id }.toSet()
                _groups.value = Loadable(
                    data = GroupsData(
                        mine = mine,
                        discover = discover.filter { it.id !in mineIds },
                    ),
                )
            } catch (error: Throwable) {
                if (_groups.value.data == null) {
                    _groups.value = Loadable(error = messageOf(error))
                }
            }
        }
    }

    fun loadGroup(slug: String) {
        viewModelScope.launch {
            _group.value = Loadable(loading = true)
            try {
                val payload = repository.community(slug)
                val assets = if (payload.isMember) {
                    runCatching { repository.groupAssets(slug) }.getOrDefault(emptyList())
                } else {
                    emptyList()
                }
                _group.value = Loadable(data = GroupDetailData(payload, assets))
            } catch (error: Throwable) {
                _group.value = Loadable(error = messageOf(error))
            }
        }
    }

    fun joinGroup(slug: String) {
        if (_groupBusy.value) return
        viewModelScope.launch {
            _groupBusy.value = true
            try {
                val result = repository.joinGroup(slug)
                _notice.value = str(
                    if (result.pending) {
                        R.string.notice_group_pending
                    } else {
                        R.string.notice_group_joined
                    },
                )
                loadGroup(slug)
                loadGroups(showSpinner = false)
            } catch (error: Throwable) {
                _notice.value = messageOf(error)
            } finally {
                _groupBusy.value = false
            }
        }
    }

    fun leaveGroup(slug: String) {
        if (_groupBusy.value) return
        viewModelScope.launch {
            _groupBusy.value = true
            try {
                repository.leaveGroup(slug)
                _notice.value = str(R.string.notice_group_left)
                loadGroup(slug)
                loadGroups(showSpinner = false)
            } catch (error: Throwable) {
                _notice.value = messageOf(error)
            } finally {
                _groupBusy.value = false
            }
        }
    }

    fun updateAvatar(uri: Uri?) {
        if (_avatarBusy.value) return
        viewModelScope.launch {
            _avatarBusy.value = true
            try {
                val user = repository.updateAvatar(uri)
                _session.update { current ->
                    current.user?.let { current.copy(user = it.copy(avatarUrl = user.avatarUrl)) }
                        ?: current
                }
                loadProfile()
                _notice.value = str(
                    if (uri == null) R.string.notice_avatar_removed else R.string.notice_avatar_updated,
                )
            } catch (error: Throwable) {
                _notice.value = messageOf(error)
            } finally {
                _avatarBusy.value = false
            }
        }
    }

    /** Tarayıcıda açılacak Facebook giriş adresini üretir. */
    fun startSocial(onUrl: (String) -> Unit) {
        if (_socialBusy.value) return
        viewModelScope.launch {
            _socialBusy.value = true
            _socialError.value = null
            try {
                onUrl(repository.socialStartUrl())
            } catch (error: Throwable) {
                _socialError.value = messageOf(error)
            } finally {
                _socialBusy.value = false
            }
        }
    }

    fun disconnectSocial(id: String) {
        viewModelScope.launch {
            try {
                repository.disconnectSocial(id)
                _social.update { current ->
                    Loadable(
                        data = current.data?.let { payload ->
                            payload.copy(items = payload.items.filterNot { it.id == id })
                        },
                    )
                }
                _notice.value = str(R.string.notice_social_disconnected)
            } catch (error: Throwable) {
                _socialError.value = messageOf(error)
            }
        }
    }

    fun shareSocial(
        assetId: String,
        provider: String,
        format: String,
        caption: String?,
        onShared: () -> Unit,
    ) {
        if (_socialBusy.value) return
        viewModelScope.launch {
            _socialBusy.value = true
            _socialError.value = null
            try {
                repository.shareSocial(assetId, provider, format, null, caption)
                _notice.value = str(
                    R.string.notice_social_shared,
                    if (provider == "instagram") "Instagram" else "Facebook",
                )
                onShared()
            } catch (error: Throwable) {
                _socialError.value = messageOf(error)
            } finally {
                _socialBusy.value = false
            }
        }
    }

    fun clearSocialError() {
        _socialError.value = null
    }

    // -----------------------------------------------------------------------
    // Yazma
    // -----------------------------------------------------------------------

    fun createAsset(
        typeId: String,
        title: String,
        description: String?,
        visibility: String,
        coverUri: Uri?,
        locationName: String? = null,
        latitude: Double? = null,
        longitude: Double? = null,
        viewerIds: List<String> = emptyList(),
        onCreated: (String) -> Unit,
    ) {
        if (typeId.isBlank() || title.isBlank()) {
            _formError.value = str(R.string.error_asset_required)
            return
        }
        if (visibility == "selected" && viewerIds.isEmpty()) {
            _formError.value = str(R.string.error_asset_viewers_required)
            return
        }
        viewModelScope.launch {
            _formBusy.value = true
            _formError.value = null
            try {
                val asset = repository.createAsset(
                    typeId = typeId,
                    title = title,
                    description = description,
                    visibility = visibility,
                    coverUri = coverUri,
                    locationName = locationName,
                    latitude = latitude,
                    longitude = longitude,
                    viewerIds = viewerIds,
                )
                loadHome()
                loadAssets()
                loadArchive()
                _notice.value = str(R.string.notice_asset_added, asset.title)
                onCreated(asset.id)
            } catch (error: Throwable) {
                _formError.value = messageOf(error)
            } finally {
                _formBusy.value = false
            }
        }
    }

    fun updateAsset(
        assetId: String,
        typeId: String,
        title: String,
        description: String?,
        visibility: String,
        coverUri: Uri?,
        locationName: String? = null,
        latitude: Double? = null,
        longitude: Double? = null,
        clearLocation: Boolean = false,
        viewerIds: List<String> = emptyList(),
        onSaved: (String) -> Unit,
    ) {
        if (typeId.isBlank() || title.isBlank()) {
            _formError.value = str(R.string.error_asset_required)
            return
        }
        if (visibility == "selected" && viewerIds.isEmpty()) {
            _formError.value = str(R.string.error_asset_viewers_required)
            return
        }
        viewModelScope.launch {
            _formBusy.value = true
            _formError.value = null
            try {
                val asset = repository.updateAsset(
                    assetId = assetId,
                    typeId = typeId,
                    title = title,
                    description = description,
                    visibility = visibility,
                    coverUri = coverUri,
                    locationName = locationName,
                    latitude = latitude,
                    longitude = longitude,
                    clearLocation = clearLocation,
                    viewerIds = viewerIds,
                )
                loadDetail(assetId)
                loadHome()
                loadAssets()
                loadArchive()
                _notice.value = str(R.string.notice_asset_updated, asset.title)
                onSaved(asset.id)
            } catch (error: Throwable) {
                _formError.value = messageOf(error)
            } finally {
                _formBusy.value = false
            }
        }
    }

    fun addEntry(
        assetId: String,
        type: String,
        title: String?,
        body: String?,
        visibility: String,
        occurredAt: String? = null,
        mediaUris: List<Uri>,
        measurement: MeasurementInput?,
        locationName: String? = null,
        latitude: Double? = null,
        longitude: Double? = null,
        onSaved: () -> Unit,
    ) {
        if (title.isNullOrBlank() && body.isNullOrBlank()) {
            _formError.value = str(R.string.error_entry_text_required)
            return
        }
        viewModelScope.launch {
            _formBusy.value = true
            _formError.value = null
            try {
                repository.addEntry(
                    assetId,
                    type,
                    title,
                    body,
                    visibility,
                    occurredAt,
                    mediaUris,
                    measurement,
                    locationName,
                    latitude,
                    longitude,
                )
                loadDetail(assetId)
                loadHome()
                loadArchive()
                _notice.value = str(R.string.notice_entry_added)
                onSaved()
            } catch (error: Throwable) {
                _formError.value = messageOf(error)
            } finally {
                _formBusy.value = false
            }
        }
    }

    fun updateEntry(
        assetId: String,
        entryId: String,
        type: String,
        title: String?,
        body: String?,
        visibility: String,
        occurredAt: String? = null,
        newMediaUris: List<Uri> = emptyList(),
        measurement: MeasurementInput? = null,
        locationName: String? = null,
        latitude: Double? = null,
        longitude: Double? = null,
        clearLocation: Boolean = false,
        onSaved: () -> Unit,
    ) {
        if (title.isNullOrBlank() && body.isNullOrBlank()) {
            _formError.value = str(R.string.error_entry_text_required)
            return
        }
        viewModelScope.launch {
            _formBusy.value = true
            _formError.value = null
            try {
                repository.updateEntry(
                    entryId = entryId,
                    type = type,
                    title = title,
                    body = body,
                    visibility = visibility,
                    occurredAt = occurredAt,
                    newMediaUris = newMediaUris,
                    measurement = measurement,
                    locationName = locationName,
                    latitude = latitude,
                    longitude = longitude,
                    clearLocation = clearLocation,
                )
                loadDetail(assetId)
                loadHome()
                loadArchive()
                _notice.value = str(R.string.notice_entry_updated)
                onSaved()
            } catch (error: Throwable) {
                _formError.value = messageOf(error)
            } finally {
                _formBusy.value = false
            }
        }
    }

    fun deleteEntry(assetId: String, entryId: String) {
        viewModelScope.launch {
            try {
                repository.deleteEntry(entryId)
                loadDetail(assetId)
                loadHome()
                loadArchive()
                _notice.value = str(R.string.notice_entry_deleted)
            } catch (error: Throwable) {
                _notice.value = messageOf(error)
            }
        }
    }

    fun toggleLike(post: FeedPost) {
        viewModelScope.launch {
            try {
                val result = repository.toggleLike(post.id, post.likedByMe)
                _explore.update { current ->
                    val data = current.data ?: return@update current
                    current.copy(
                        data = data.copy(
                            posts = data.posts.map {
                                if (it.id == post.id) {
                                    it.copy(likedByMe = result.liked, likeCount = result.likeCount)
                                } else {
                                    it
                                }
                            },
                        ),
                    )
                }
            } catch (error: Throwable) {
                _notice.value = messageOf(error)
            }
        }
    }

    fun markAllRead() {
        viewModelScope.launch {
            try {
                repository.markAllRead()
                loadNotifications()
            } catch (error: Throwable) {
                _notice.value = messageOf(error)
            }
        }
    }

    fun markRead(id: String) {
        viewModelScope.launch {
            try {
                repository.markRead(id)
                loadNotifications()
            } catch (error: Throwable) {
                _notice.value = messageOf(error)
            }
        }
    }

    fun addAccess(assetId: String, username: String) {
        if (username.isBlank()) {
            _formError.value = str(R.string.error_username_required)
            return
        }
        viewModelScope.launch {
            _formBusy.value = true
            _formError.value = null
            try {
                val user: UserMini = repository.addAccess(assetId, username)
                loadDetail(assetId)
                _notice.value = str(R.string.notice_access_granted, user.username)
            } catch (error: Throwable) {
                _formError.value = messageOf(error)
            } finally {
                _formBusy.value = false
            }
        }
    }

    fun removeAccess(assetId: String, userId: String) {
        viewModelScope.launch {
            try {
                repository.removeAccess(assetId, userId)
                loadDetail(assetId)
                _notice.value = str(R.string.notice_access_removed)
            } catch (error: Throwable) {
                _notice.value = messageOf(error)
            }
        }
    }

    fun follow(user: User) {
        viewModelScope.launch {
            try {
                if (user.isFollowing) repository.unfollow(user.username) else repository.follow(user.username)
                loadExplore()
                _notice.value =
                    if (user.isFollowing) {
                        str(R.string.notice_unfollowed, user.username)
                    } else {
                        str(R.string.notice_following, user.username)
                    }
            } catch (error: Throwable) {
                _notice.value = messageOf(error)
            }
        }
    }

    fun requestFriend(username: String, displayName: String) {
        friendAction(username) {
            val status = repository.requestFriend(username)
            _notice.value = str(
                if (status == "pending_out") {
                    R.string.notice_friend_requested
                } else {
                    R.string.notice_friend_accepted
                },
                displayName,
            )
        }
    }

    fun acceptFriend(username: String, displayName: String) {
        friendAction(username) {
            repository.acceptFriend(username)
            _notice.value = str(R.string.notice_friend_accepted, displayName)
        }
    }

    fun declineFriend(username: String) {
        friendAction(username) {
            repository.declineFriend(username)
            _notice.value = str(R.string.notice_friend_declined)
        }
    }

    fun cancelFriendRequest(username: String) {
        friendAction(username) {
            repository.removeFriend(username)
            _notice.value = str(R.string.notice_friend_request_cancelled)
        }
    }

    fun removeFriend(username: String, displayName: String) {
        friendAction(username) {
            repository.removeFriend(username)
            _notice.value = str(R.string.notice_friend_removed, displayName)
        }
    }

    private fun friendAction(username: String, block: suspend () -> Unit) {
        if (_friendsBusy.value) return
        viewModelScope.launch {
            _friendsBusy.value = true
            try {
                block()
                loadFriends(showSpinner = false)
                loadExplore()
            } catch (error: Throwable) {
                _notice.value = messageOf(error)
            } finally {
                _friendsBusy.value = false
            }
        }
    }

    fun clearFormError() {
        _formError.value = null
    }
    fun consumeNotice() {
        _notice.value = null
    }

    fun setNotice(text: String) {
        _notice.value = text
    }

    private fun messageOf(error: Throwable): String {
        if (error is VhException && error.status == 401) {
            _session.value = SessionUi(checking = false, user = null)
            viewModelScope.launch { repository.logout() }
        }
        return error.message ?: str(R.string.error_unexpected)
    }

    companion object {
        fun factory(repository: VhRepository, context: Context) = viewModelFactory {
            initializer { VhViewModel(repository, context.applicationContext) }
        }
    }
}
