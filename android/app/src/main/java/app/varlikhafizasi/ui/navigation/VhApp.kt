package app.varlikhafizasi.ui.navigation

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.List
import androidx.compose.material.icons.outlined.Alarm
import androidx.compose.material.icons.outlined.Explore
import androidx.compose.material.icons.outlined.Groups
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material.icons.outlined.PhotoLibrary
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import app.varlikhafizasi.AppGraph
import app.varlikhafizasi.R
import app.varlikhafizasi.data.User
import app.varlikhafizasi.data.local.AppMode
import app.varlikhafizasi.reminders.ReminderReceiver
import app.varlikhafizasi.ui.VhViewModel
import app.varlikhafizasi.ui.local.LocalNavigator
import app.varlikhafizasi.ui.local.LocalOnboardingScreen
import app.varlikhafizasi.ui.local.LocalViewModel
import app.varlikhafizasi.ui.screens.AddEntryScreen
import app.varlikhafizasi.ui.screens.AssetDetailScreen
import app.varlikhafizasi.ui.screens.ArchiveScreen
import app.varlikhafizasi.ui.screens.AssetsScreen
import app.varlikhafizasi.ui.screens.ExploreScreen
import app.varlikhafizasi.ui.screens.FriendsScreen
import app.varlikhafizasi.ui.screens.GroupAssetScreen
import app.varlikhafizasi.ui.screens.GroupDetailScreen
import app.varlikhafizasi.ui.screens.GroupsScreen
import app.varlikhafizasi.ui.screens.HomeScreen
import app.varlikhafizasi.ui.screens.LoginScreen
import app.varlikhafizasi.ui.screens.NewAssetScreen
import app.varlikhafizasi.ui.screens.NewGroupScreen
import app.varlikhafizasi.ui.screens.NotificationsScreen
import app.varlikhafizasi.ui.screens.ProfileScreen
import app.varlikhafizasi.ui.theme.Clay
import app.varlikhafizasi.ui.theme.Forest
import app.varlikhafizasi.ui.theme.Line
import app.varlikhafizasi.ui.theme.Muted
import app.varlikhafizasi.ui.theme.Paper
import app.varlikhafizasi.ui.theme.TerracottaPale
import app.varlikhafizasi.ui.theme.Ivory
import java.time.Instant

private object Routes {
    const val HOME = "home"
    const val ASSETS = "assets"
    const val ARCHIVE = "archive"
    const val EXPLORE = "explore"
    const val GROUPS = "groups"
    const val PROFILE = "profile"
    const val FRIENDS = "friends"
    const val NOTIFICATIONS = "notifications"
    const val NEW_ASSET = "newAsset"
    const val NEW_GROUP = "newGroup"
    const val ASSET_DETAIL = "asset/{id}"
    const val GROUP_DETAIL = "group/{slug}?tab={tab}"
    const val GROUP_ASSET = "group/{slug}/asset/{assetId}"
    const val EDIT_ASSET = "editAsset/{id}"
    const val ADD_ENTRY = "addEntry/{assetId}"
    const val EDIT_ENTRY = "editEntry/{assetId}/{entryId}"

    fun asset(id: String) = "asset/$id"
    fun group(slug: String, tab: String = "feed") = "group/$slug?tab=$tab"
    fun groupAsset(slug: String, assetId: String) = "group/$slug/asset/$assetId"
    fun editAsset(id: String) = "editAsset/$id"
    fun addEntry(id: String) = "addEntry/$id"
    fun editEntry(assetId: String, entryId: String) = "editEntry/$assetId/$entryId"
}

@Composable
fun VhRoot(
    vm: VhViewModel,
    pendingAssetId: String? = null,
    onPendingAssetConsumed: () -> Unit = {},
    onModeChosen: () -> Unit = {},
) {
    val mode by vm.mode.collectAsStateWithLifecycle()
    // Bildirim izni, ilk açılışta değil kullanıcı bir mod seçtikten sonra istenir.
    LaunchedEffect(mode) {
        val current = mode
        if (current == AppMode.LOCAL || current == AppMode.CLOUD) onModeChosen()
    }
    val session by vm.session.collectAsStateWithLifecycle()
    val context = LocalContext.current

    when (mode) {
        null -> Splash()
        AppMode.UNSET -> LocalOnboardingScreen(
            onLocal = { vm.chooseMode(AppMode.LOCAL) },
            onCloud = { vm.chooseMode(AppMode.CLOUD) },
        )
        AppMode.LOCAL -> {
            val localVm: LocalViewModel = viewModel(
                factory = LocalViewModel.factory(
                    AppGraph.localStore,
                    AppGraph.localExporter,
                    context,
                ),
            )
            LocalNavigator(
                vm = localVm,
                cloudVm = vm,
                pendingAssetId = pendingAssetId,
                onPendingAssetConsumed = onPendingAssetConsumed,
            )
        }
        AppMode.CLOUD -> when {
            session.checking -> Splash()
            session.user == null -> LoginScreen(
                vm = vm,
                sessionError = session.error,
                onUseLocal = { vm.chooseMode(AppMode.LOCAL) },
            )
            else -> MainNavigator(vm, session.user!!, pendingAssetId, onPendingAssetConsumed)
        }
    }
}

@Composable
private fun Splash() {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Forest),
        contentAlignment = Alignment.Center,
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Box(
                modifier = Modifier
                    .size(62.dp)
                    .background(Paper.copy(alpha = 0.08f), RoundedCornerShape(18.dp)),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    "iz",
                    style = MaterialTheme.typography.headlineMedium,
                    color = Paper,
                    fontFamily = FontFamily.Serif,
                )
            }
            androidx.compose.foundation.layout.Spacer(Modifier.size(16.dp))
            Text(
                "izleer",
                style = MaterialTheme.typography.headlineSmall,
                color = Paper,
            )
            Text(
                stringResource(R.string.splash_loading),
                style = MaterialTheme.typography.bodySmall,
                color = Paper.copy(alpha = 0.55f),
            )
            androidx.compose.foundation.layout.Spacer(Modifier.size(22.dp))
            CircularProgressIndicator(
                color = Paper.copy(alpha = 0.6f),
                strokeWidth = 2.dp,
                modifier = Modifier.size(22.dp),
            )
        }
    }
}

@Composable
private fun MainNavigator(
    vm: VhViewModel,
    viewer: User,
    pendingAssetId: String?,
    onPendingAssetConsumed: () -> Unit,
) {
    val nav = rememberNavController()
    val backStack by nav.currentBackStackEntryAsState()
    val route = backStack?.destination?.route
    val snackbar = remember { SnackbarHostState() }
    val notice by vm.notice.collectAsStateWithLifecycle()
    val reminders by vm.reminders.collectAsStateWithLifecycle()
    val context = LocalContext.current
    var dueAlert by remember { mutableStateOf<DueAlert?>(null) }
    // Aynı hatırlatma için uyarı bir oturumda yalnızca bir kez gösterilir.
    val announcedAlerts = remember { mutableSetOf<String>() }

    LaunchedEffect(notice) {
        val message = notice ?: return@LaunchedEffect
        snackbar.showSnackbar(message)
        vm.consumeNotice()
    }

    // Oturum açıkken hatırlatmaları tazele; alarm planı sunucuyla eşitlenir.
    LaunchedEffect(viewer.id) { vm.loadReminders() }
    // Yerel moddan gelen kayıtlar varsa giriş sonrası otomatik aktarılır.
    LaunchedEffect(viewer.id) { vm.startLocalMigrationIfPending() }
    val migration by vm.migration.collectAsStateWithLifecycle()

    // Alarm çaldığında uygulama açıksa ekran uyarısı da gösterilir.
    DisposableEffect(context) {
        val filter = IntentFilter(ReminderReceiver.ACTION_DUE)
        val receiver = object : BroadcastReceiver() {
            override fun onReceive(receiverContext: Context?, intent: Intent?) {
                val data = intent ?: return
                val entryId = data.getStringExtra(ReminderReceiver.EXTRA_ENTRY_ID) ?: return
                val assetId = data.getStringExtra(ReminderReceiver.EXTRA_ASSET_ID) ?: return
                if (!announcedAlerts.add(entryId)) return
                dueAlert = DueAlert(
                    entryId = entryId,
                    assetId = assetId,
                    assetTitle = data.getStringExtra(ReminderReceiver.EXTRA_ASSET_TITLE),
                    title = data.getStringExtra(ReminderReceiver.EXTRA_TITLE),
                    body = data.getStringExtra(ReminderReceiver.EXTRA_BODY),
                )
            }
        }
        ContextCompat.registerReceiver(
            context,
            receiver,
            filter,
            ContextCompat.RECEIVER_NOT_EXPORTED,
        )
        onDispose { runCatching { context.unregisterReceiver(receiver) } }
    }

    // Uygulama kapalıyken kaçırılan hatırlatmalar açılışta yakalanır.
    LaunchedEffect(reminders.data) {
        val items = reminders.data.orEmpty()
        if (items.isEmpty()) return@LaunchedEffect
        val now = System.currentTimeMillis()
        val next = items.firstOrNull { item ->
            if (item.doneAt != null || item.id in announcedAlerts) return@firstOrNull false
            val due = item.dueAt
                ?.let { runCatching { Instant.parse(it).toEpochMilli() }.getOrNull() }
                ?: return@firstOrNull false
            due <= now
        } ?: return@LaunchedEffect
        announcedAlerts += next.id
        dueAlert = DueAlert(
            entryId = next.id,
            assetId = next.assetId,
            assetTitle = next.assetTitle,
            title = next.title,
            body = next.body,
        )
    }

    // Bildirimden gelen varlık bağlantısı bir kez açılır.
    LaunchedEffect(pendingAssetId) {
        val id = pendingAssetId ?: return@LaunchedEffect
        nav.navigate(Routes.asset(id))
        onPendingAssetConsumed()
    }

    val showBar = route in setOf(
        Routes.HOME,
        Routes.ASSETS,
        Routes.ARCHIVE,
        Routes.EXPLORE,
        Routes.GROUPS,
        Routes.PROFILE,
    )

    Scaffold(
        containerColor = Paper,
        snackbarHost = { SnackbarHost(snackbar) },
        bottomBar = {
            if (showBar) {
                VhBottomBar(current = route) { target -> nav.navigateTop(target) }
            }
        },
    ) { innerPadding ->
        NavHost(
            navController = nav,
            startDestination = Routes.HOME,
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding),
        ) {
            composable(Routes.HOME) {
                HomeScreen(
                    vm = vm,
                    viewer = viewer,
                    onOpenAsset = { nav.navigate(Routes.asset(it)) },
                    onOpenAssets = { nav.navigateTop(Routes.ASSETS) },
                    onOpenArchive = { nav.navigateTop(Routes.ARCHIVE) },
                    onOpenNotifications = { nav.navigate(Routes.NOTIFICATIONS) },
                    onNewAsset = { nav.navigate(Routes.NEW_ASSET) },
                    onOpenFriends = { nav.navigate(Routes.FRIENDS) },
                    onOpenGroup = { slug, tab -> nav.navigate(Routes.group(slug, tab)) },
                    onOpenGroups = { nav.navigateTop(Routes.GROUPS) },
                )
            }
            composable(Routes.ASSETS) {
                AssetsScreen(
                    vm = vm,
                    onOpenAsset = { nav.navigate(Routes.asset(it)) },
                    onNewAsset = { nav.navigate(Routes.NEW_ASSET) },
                )
            }
            composable(Routes.ARCHIVE) {
                ArchiveScreen(vm)
            }
            composable(Routes.EXPLORE) {
                ExploreScreen(
                    vm = vm,
                    onOpenAsset = { nav.navigate(Routes.asset(it)) },
                )
            }
            composable(Routes.GROUPS) {
                GroupsScreen(
                    vm = vm,
                    onOpenGroup = { nav.navigate(Routes.group(it)) },
                    onNewGroup = { nav.navigate(Routes.NEW_GROUP) },
                )
            }
            composable(Routes.NEW_GROUP) {
                NewGroupScreen(
                    vm = vm,
                    onBack = { nav.popBackStack() },
                    onCreated = { slug ->
                        nav.navigate(Routes.group(slug)) {
                            popUpTo(Routes.NEW_GROUP) { inclusive = true }
                        }
                    },
                )
            }
            composable(
                route = Routes.GROUP_DETAIL,
                arguments = listOf(
                    navArgument("slug") { type = NavType.StringType },
                    navArgument("tab") {
                        type = NavType.StringType
                        defaultValue = "feed"
                    },
                ),
            ) { entry ->
                val slug = entry.arguments?.getString("slug").orEmpty()
                GroupDetailScreen(
                    vm = vm,
                    slug = slug,
                    viewerId = viewer.id,
                    onBack = { nav.popBackStack() },
                    onOpenAsset = { nav.navigate(Routes.asset(it)) },
                    onOpenGroupAsset = { nav.navigate(Routes.groupAsset(slug, it)) },
                    initialTab = entry.arguments?.getString("tab") ?: "feed",
                )
            }
            composable(
                route = Routes.GROUP_ASSET,
                arguments = listOf(
                    navArgument("slug") { type = NavType.StringType },
                    navArgument("assetId") { type = NavType.StringType },
                ),
            ) { entry ->
                val slug = entry.arguments?.getString("slug").orEmpty()
                val assetId = entry.arguments?.getString("assetId").orEmpty()
                GroupAssetScreen(
                    vm = vm,
                    slug = slug,
                    assetId = assetId,
                    onBack = { nav.popBackStack() },
                )
            }
            composable(Routes.PROFILE) {
                ProfileScreen(
                    vm = vm,
                    viewer = viewer,
                    onOpenAsset = { nav.navigate(Routes.asset(it)) },
                    onOpenNotifications = { nav.navigate(Routes.NOTIFICATIONS) },
                    onOpenFriends = { nav.navigate(Routes.FRIENDS) },
                )
            }
            composable(Routes.FRIENDS) {
                FriendsScreen(
                    vm = vm,
                    onBack = { nav.popBackStack() },
                    onOpenAsset = { nav.navigate(Routes.asset(it)) },
                )
            }
            composable(Routes.NOTIFICATIONS) {
                NotificationsScreen(
                    vm = vm,
                    onBack = { nav.popBackStack() },
                    onOpenFriends = { nav.navigate(Routes.FRIENDS) },
                    onOpenAsset = { nav.navigate(Routes.asset(it)) },
                )
            }
            composable(Routes.NEW_ASSET) {
                NewAssetScreen(
                    vm = vm,
                    onBack = { nav.popBackStack() },
                    onCreated = { id ->
                        nav.navigate(Routes.asset(id)) {
                            popUpTo(Routes.NEW_ASSET) { inclusive = true }
                        }
                    },
                )
            }
            composable(
                route = Routes.ASSET_DETAIL,
                arguments = listOf(navArgument("id") { type = NavType.StringType }),
            ) { entry ->
                val id = entry.arguments?.getString("id").orEmpty()
                AssetDetailScreen(
                    vm = vm,
                    viewer = viewer,
                    assetId = id,
                    onBack = { nav.popBackStack() },
                    onEditAsset = { nav.navigate(Routes.editAsset(id)) },
                    onAddEntry = { nav.navigate(Routes.addEntry(id)) },
                    onEditEntry = { entryId -> nav.navigate(Routes.editEntry(id, entryId)) },
                    onDeleted = { nav.popBackStack() },
                )
            }
            composable(
                route = Routes.EDIT_ASSET,
                arguments = listOf(navArgument("id") { type = NavType.StringType }),
            ) { entry ->
                val id = entry.arguments?.getString("id").orEmpty()
                NewAssetScreen(
                    vm = vm,
                    assetId = id,
                    onBack = { nav.popBackStack() },
                    onCreated = { nav.popBackStack() },
                )
            }
            composable(
                route = Routes.ADD_ENTRY,
                arguments = listOf(navArgument("assetId") { type = NavType.StringType }),
            ) { entry ->
                val assetId = entry.arguments?.getString("assetId").orEmpty()
                AddEntryScreen(
                    vm = vm,
                    assetId = assetId,
                    onBack = { nav.popBackStack() },
                    onSaved = { nav.popBackStack() },
                )
            }
            composable(
                route = Routes.EDIT_ENTRY,
                arguments = listOf(
                    navArgument("assetId") { type = NavType.StringType },
                    navArgument("entryId") { type = NavType.StringType },
                ),
            ) { backStackEntry ->
                val assetId = backStackEntry.arguments?.getString("assetId").orEmpty()
                val entryId = backStackEntry.arguments?.getString("entryId").orEmpty()
                AddEntryScreen(
                    vm = vm,
                    assetId = assetId,
                    entryId = entryId,
                    onBack = { nav.popBackStack() },
                    onSaved = { nav.popBackStack() },
                )
            }
        }
    }

    dueAlert?.let { alert ->
        AlertDialog(
            onDismissRequest = { dueAlert = null },
            icon = {
                Icon(
                    Icons.Outlined.Alarm,
                    contentDescription = null,
                    tint = Clay,
                    modifier = Modifier.size(26.dp),
                )
            },
            title = {
                Text(
                    stringResource(R.string.reminder_alert_title),
                    style = MaterialTheme.typography.headlineSmall,
                    color = Forest,
                )
            },
            text = {
                val assetName = alert.assetTitle?.trim()?.takeIf { it.isNotEmpty() }
                    ?: stringResource(R.string.common_asset)
                val detail = alert.title?.trim()?.takeIf { it.isNotEmpty() }
                    ?: alert.body
                        ?.trim()
                        ?.replace(Regex("\\s+"), " ")
                        ?.take(160)
                        ?.takeIf { it.isNotEmpty() }
                Column {
                    Text(
                        assetName,
                        style = MaterialTheme.typography.titleMedium,
                        color = Forest,
                    )
                    Text(
                        detail ?: stringResource(R.string.reminder_alert_fallback),
                        style = MaterialTheme.typography.bodyMedium,
                        color = Muted,
                        modifier = Modifier.padding(top = 4.dp),
                    )
                }
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        val assetId = alert.assetId
                        dueAlert = null
                        nav.navigate(Routes.asset(assetId))
                    },
                ) {
                    Text(stringResource(R.string.reminder_alert_open), color = Forest)
                }
            },
            dismissButton = {
                TextButton(onClick = { dueAlert = null }) {
                    Text(stringResource(R.string.reminder_alert_dismiss), color = Muted)
                }
            },
        )
    }

    // Buluta geçişte yerel kayıtların aktarım durumu.
    if (migration.running || migration.done || migration.error != null) {
        AlertDialog(
            onDismissRequest = {
                if (!migration.running) vm.dismissMigration()
            },
            title = {
                Text(
                    when {
                        migration.running -> stringResource(R.string.local_migration_running)
                        migration.done -> stringResource(R.string.local_migration_done_title)
                        else -> stringResource(R.string.local_migration_error)
                    },
                    color = Forest,
                    style = MaterialTheme.typography.headlineSmall,
                )
            },
            text = {
                Column {
                    if (migration.running) {
                        val progress = migration.progress
                        Text(
                            if (progress != null) {
                                stringResource(R.string.local_migration_progress, progress)
                            } else {
                                stringResource(R.string.local_migration_keep)
                            },
                            style = MaterialTheme.typography.bodyMedium,
                            color = Muted,
                        )
                        androidx.compose.foundation.layout.Spacer(
                            androidx.compose.ui.Modifier.height(14.dp),
                        )
                        CircularProgressIndicator(
                            color = Forest,
                            strokeWidth = 2.dp,
                            modifier = Modifier.size(24.dp),
                        )
                    } else if (migration.done) {
                        val summary = migration.summary
                        Text(
                            stringResource(
                                R.string.local_migration_done_body,
                                summary?.assets ?: 0,
                                summary?.entries ?: 0,
                            ),
                            style = MaterialTheme.typography.bodyMedium,
                            color = Muted,
                        )
                    } else {
                        Text(
                            migration.error ?: "",
                            style = MaterialTheme.typography.bodyMedium,
                            color = Muted,
                        )
                        androidx.compose.foundation.layout.Spacer(
                            androidx.compose.ui.Modifier.height(8.dp),
                        )
                        Text(
                            stringResource(R.string.local_migration_keep),
                            style = MaterialTheme.typography.bodySmall,
                            color = Muted,
                        )
                    }
                }
            },
            confirmButton = {
                if (!migration.running) {
                    TextButton(
                        onClick = {
                            if (migration.error != null) {
                                vm.retryLocalMigration()
                            } else {
                                vm.dismissMigration()
                            }
                        },
                    ) {
                        Text(
                            if (migration.error != null) {
                                stringResource(R.string.local_migration_retry)
                            } else {
                                stringResource(R.string.common_back)
                            },
                            color = Forest,
                        )
                    }
                }
            },
            dismissButton = {
                if (!migration.running && migration.error != null) {
                    TextButton(onClick = { vm.dismissMigration() }) {
                        Text(stringResource(R.string.local_migration_later), color = Muted)
                    }
                }
            },
        )
    }
}

/** Ekranda gösterilecek zamanı gelmiş hatırlatma bilgisi. */
private data class DueAlert(
    val entryId: String,
    val assetId: String,
    val assetTitle: String?,
    val title: String?,
    val body: String?,
)

private fun NavHostController.navigateTop(route: String) {
    navigate(route) {
        popUpTo(graph.findStartDestination().id) { saveState = true }
        launchSingleTop = true
        restoreState = true
    }
}

private data class TabItem(val route: String, val label: Int, val icon: ImageVector)

private val tabItems = listOf(
    TabItem(Routes.HOME, R.string.nav_home, Icons.Outlined.Home),
    TabItem(Routes.ASSETS, R.string.nav_assets, Icons.AutoMirrored.Outlined.List),
    TabItem(Routes.ARCHIVE, R.string.nav_archive, Icons.Outlined.PhotoLibrary),
    TabItem(Routes.GROUPS, R.string.nav_groups, Icons.Outlined.Groups),
    TabItem(Routes.EXPLORE, R.string.nav_explore, Icons.Outlined.Explore),
    TabItem(Routes.PROFILE, R.string.nav_profile, Icons.Outlined.Person),
)

@Composable
private fun VhBottomBar(current: String?, onNavigate: (String) -> Unit) {
    Column(Modifier.background(Ivory)) {
        Box(
            Modifier
                .fillMaxWidth()
                .height(1.dp)
                .background(Line),
        )
        NavigationBar(
            containerColor = Ivory,
            tonalElevation = 0.dp,
        ) {
            tabItems.forEach { tab ->
                val selected = current == tab.route
                val label = stringResource(tab.label)
                NavigationBarItem(
                    selected = selected,
                    onClick = { onNavigate(tab.route) },
                    icon = {
                        Icon(
                            imageVector = tab.icon,
                            contentDescription = label,
                            modifier = Modifier.size(21.dp),
                        )
                    },
                    label = {
                        Text(
                            label,
                            style = MaterialTheme.typography.labelSmall,
                            color = if (selected) Forest else Muted,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                        )
                    },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = Forest,
                        unselectedIconColor = Muted,
                        indicatorColor = TerracottaPale,
                        selectedTextColor = Forest,
                        unselectedTextColor = Muted,
                    ),
                )
            }
        }
    }
}
