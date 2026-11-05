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
import app.varlikhafizasi.data.ArchivePage
import app.varlikhafizasi.data.Asset
import app.varlikhafizasi.data.AssetDetail
import app.varlikhafizasi.data.AssetType
import app.varlikhafizasi.data.FeedPost
import app.varlikhafizasi.data.Measurement
import app.varlikhafizasi.data.MeasurementInput
import app.varlikhafizasi.data.NotificationPage
import app.varlikhafizasi.data.ProfilePayload
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

    private val _archive = MutableStateFlow(Loadable<ArchivePage>())
    val archive: StateFlow<Loadable<ArchivePage>> = _archive.asStateFlow()

    private val _explore = MutableStateFlow(Loadable<ExploreData>())
    val explore: StateFlow<Loadable<ExploreData>> = _explore.asStateFlow()

    private val _notifications = MutableStateFlow(Loadable<NotificationPage>())
    val notifications: StateFlow<Loadable<NotificationPage>> = _notifications.asStateFlow()

    private val _profile = MutableStateFlow(Loadable<ProfileData>())
    val profile: StateFlow<Loadable<ProfileData>> = _profile.asStateFlow()

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
            _archive.value = Loadable()
            _explore.value = Loadable()
            _notifications.value = Loadable()
            _profile.value = Loadable()
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
        onCreated: (String) -> Unit,
    ) {
        if (typeId.isBlank() || title.isBlank()) {
            _formError.value = str(R.string.error_asset_required)
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

    fun addEntry(
        assetId: String,
        type: String,
        title: String?,
        body: String?,
        visibility: String,
        occurredAt: String? = null,
        mediaUris: List<Uri>,
        measurement: MeasurementInput?,
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
                repository.addEntry(assetId, type, title, body, visibility, occurredAt, mediaUris, measurement)
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
