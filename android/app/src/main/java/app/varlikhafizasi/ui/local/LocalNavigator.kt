package app.varlikhafizasi.ui.local

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
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.List
import androidx.compose.material.icons.outlined.Alarm
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.Settings
import androidx.compose.material3.AlertDialog
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
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import app.varlikhafizasi.R
import app.varlikhafizasi.data.local.LocalReminder
import app.varlikhafizasi.reminders.ReminderReceiver
import app.varlikhafizasi.ui.VhViewModel
import app.varlikhafizasi.ui.theme.Forest
import app.varlikhafizasi.ui.theme.Ivory
import app.varlikhafizasi.ui.theme.Line
import app.varlikhafizasi.ui.theme.Muted
import app.varlikhafizasi.ui.theme.Paper
import app.varlikhafizasi.ui.theme.TerracottaPale

private object LocalRoutes {
    const val HOME = "local/home"
    const val ASSETS = "local/assets"
    const val REMINDERS = "local/reminders"
    const val SETTINGS = "local/settings"
    const val UPGRADE = "local/upgrade"
    const val CLOUD_LOGIN = "local/cloudLogin"
    const val NEW_ASSET = "local/newAsset"
    const val ASSET = "local/asset/{id}"
    const val EDIT_ASSET = "local/editAsset/{id}"
    const val ADD_ENTRY = "local/addEntry/{assetId}"
    const val EDIT_ENTRY = "local/editEntry/{assetId}/{entryId}"

    fun asset(id: String) = "local/asset/$id"
    fun editAsset(id: String) = "local/editAsset/$id"
    fun addEntry(assetId: String) = "local/addEntry/$assetId"
    fun editEntry(assetId: String, entryId: String) = "local/editEntry/$assetId/$entryId"
}

@Composable
fun LocalNavigator(
    vm: LocalViewModel,
    cloudVm: VhViewModel,
    pendingAssetId: String? = null,
    onPendingAssetConsumed: () -> Unit = {},
) {
    val nav = rememberNavController()
    val backStack by nav.currentBackStackEntryAsState()
    val route = backStack?.destination?.route
    val snackbar = remember { SnackbarHostState() }
    val notice by vm.notice.collectAsStateWithLifecycle()
    val homeState by vm.home.collectAsStateWithLifecycle()
    val cloudBusy by cloudVm.authBusy.collectAsStateWithLifecycle()
    val cloudError by cloudVm.authError.collectAsStateWithLifecycle()
    val context = LocalContext.current
    var dueAlert by remember { mutableStateOf<LocalReminder?>(null) }
    val announced = remember { mutableSetOf<String>() }

    LaunchedEffect(Unit) { vm.refresh() }

    LaunchedEffect(notice) {
        val message = notice ?: return@LaunchedEffect
        snackbar.showSnackbar(message)
        vm.consumeNotice()
    }

    // Alarm çaldığında uygulama açıksa ekran uyarısı gösterilir.
    DisposableEffect(context) {
        val filter = IntentFilter(ReminderReceiver.ACTION_DUE)
        val receiver = object : BroadcastReceiver() {
            override fun onReceive(receiverContext: Context?, intent: Intent?) {
                val data = intent ?: return
                val entryId = data.getStringExtra(ReminderReceiver.EXTRA_ENTRY_ID) ?: return
                val assetId = data.getStringExtra(ReminderReceiver.EXTRA_ASSET_ID) ?: return
                if (!announced.add(entryId)) return
                dueAlert = LocalReminder(
                    entryId = entryId,
                    assetId = assetId,
                    assetTitle = data.getStringExtra(ReminderReceiver.EXTRA_ASSET_TITLE).orEmpty(),
                    title = data.getStringExtra(ReminderReceiver.EXTRA_TITLE),
                    body = data.getStringExtra(ReminderReceiver.EXTRA_BODY),
                    dueAt = System.currentTimeMillis(),
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
    LaunchedEffect(homeState.data) {
        val now = System.currentTimeMillis()
        val next = homeState.data?.reminders
            ?.firstOrNull { !it.done && it.dueAt <= now && it.entryId !in announced }
            ?: return@LaunchedEffect
        announced += next.entryId
        dueAlert = next
    }

    // Bildirimden gelen varlık bağlantısı bir kez açılır.
    LaunchedEffect(pendingAssetId) {
        val id = pendingAssetId ?: return@LaunchedEffect
        nav.navigate(LocalRoutes.asset(id))
        onPendingAssetConsumed()
    }

    val showBar = route in setOf(
        LocalRoutes.HOME,
        LocalRoutes.ASSETS,
        LocalRoutes.REMINDERS,
        LocalRoutes.SETTINGS,
    )

    Scaffold(
        containerColor = Paper,
        snackbarHost = { SnackbarHost(snackbar) },
        bottomBar = {
            if (showBar) {
                LocalBottomBar(current = route) { target -> nav.navigateTop(target) }
            }
        },
    ) { innerPadding ->
        NavHost(
            navController = nav,
            startDestination = LocalRoutes.HOME,
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding),
        ) {
            composable(LocalRoutes.HOME) {
                LocalHomeScreen(
                    vm = vm,
                    onOpenAssets = { nav.navigateTop(LocalRoutes.ASSETS) },
                    onOpenReminders = { nav.navigateTop(LocalRoutes.REMINDERS) },
                    onOpenAsset = { nav.navigate(LocalRoutes.asset(it)) },
                    onNewAsset = { nav.navigate(LocalRoutes.NEW_ASSET) },
                    onUpgrade = { nav.navigate(LocalRoutes.UPGRADE) },
                    onSettings = { nav.navigateTop(LocalRoutes.SETTINGS) },
                )
            }
            composable(LocalRoutes.ASSETS) {
                LocalAssetsScreen(
                    vm = vm,
                    onOpenAsset = { nav.navigate(LocalRoutes.asset(it)) },
                    onNewAsset = { nav.navigate(LocalRoutes.NEW_ASSET) },
                    onUpgrade = { nav.navigate(LocalRoutes.UPGRADE) },
                )
            }
            composable(LocalRoutes.REMINDERS) {
                LocalRemindersScreen(
                    vm = vm,
                    onOpenAsset = { nav.navigate(LocalRoutes.asset(it)) },
                )
            }
            composable(LocalRoutes.SETTINGS) {
                LocalSettingsScreen(
                    vm = vm,
                    onUpgrade = { nav.navigate(LocalRoutes.UPGRADE) },
                    onLogin = { nav.navigate(LocalRoutes.CLOUD_LOGIN) },
                )
            }
            composable(LocalRoutes.UPGRADE) {
                LocalUpgradeScreen(
                    onBack = { nav.popBackStack() },
                    onSwitchToCloud = { nav.navigate(LocalRoutes.CLOUD_LOGIN) },
                )
            }
            composable(LocalRoutes.CLOUD_LOGIN) {
                LocalCloudLoginScreen(
                    busy = cloudBusy,
                    error = cloudError,
                    onClearError = { cloudVm.clearAuthError() },
                    onSubmit = { identifier, password -> cloudVm.login(identifier, password) },
                    onBack = { nav.popBackStack() },
                )
            }
            composable(LocalRoutes.NEW_ASSET) {
                LocalAssetFormScreen(
                    vm = vm,
                    assetId = null,
                    onBack = { nav.popBackStack() },
                    onCreated = { id ->
                        nav.navigate(LocalRoutes.asset(id)) {
                            popUpTo(LocalRoutes.NEW_ASSET) { inclusive = true }
                        }
                    },
                )
            }
            composable(
                route = LocalRoutes.EDIT_ASSET,
                arguments = listOf(navArgument("id") { type = NavType.StringType }),
            ) { entry ->
                LocalAssetFormScreen(
                    vm = vm,
                    assetId = entry.arguments?.getString("id"),
                    onBack = { nav.popBackStack() },
                    onCreated = { nav.popBackStack() },
                )
            }
            composable(
                route = LocalRoutes.ASSET,
                arguments = listOf(navArgument("id") { type = NavType.StringType }),
            ) { entry ->
                val id = entry.arguments?.getString("id").orEmpty()
                LocalAssetScreen(
                    vm = vm,
                    assetId = id,
                    onBack = { nav.popBackStack() },
                    onEditAsset = { nav.navigate(LocalRoutes.editAsset(id)) },
                    onAddEntry = { nav.navigate(LocalRoutes.addEntry(id)) },
                    onEditEntry = { entryId ->
                        nav.navigate(LocalRoutes.editEntry(id, entryId))
                    },
                    onDeleted = { nav.popBackStack() },
                )
            }
            composable(
                route = LocalRoutes.ADD_ENTRY,
                arguments = listOf(navArgument("assetId") { type = NavType.StringType }),
            ) { entry ->
                LocalEntryFormScreen(
                    vm = vm,
                    assetId = entry.arguments?.getString("assetId").orEmpty(),
                    entryId = null,
                    onBack = { nav.popBackStack() },
                )
            }
            composable(
                route = LocalRoutes.EDIT_ENTRY,
                arguments = listOf(
                    navArgument("assetId") { type = NavType.StringType },
                    navArgument("entryId") { type = NavType.StringType },
                ),
            ) { entry ->
                LocalEntryFormScreen(
                    vm = vm,
                    assetId = entry.arguments?.getString("assetId").orEmpty(),
                    entryId = entry.arguments?.getString("entryId"),
                    onBack = { nav.popBackStack() },
                )
            }
        }
    }

    dueAlert?.let { reminder ->
        AlertDialog(
            onDismissRequest = { dueAlert = null },
            title = { Text(stringResource(R.string.reminder_alert_title), color = Forest) },
            text = {
                Column {
                    Text(
                        reminder.assetTitle.ifBlank { stringResource(R.string.common_asset) },
                        style = MaterialTheme.typography.titleMedium,
                        color = Forest,
                    )
                    Text(
                        reminder.title?.takeIf { it.isNotBlank() }
                            ?: reminder.body?.takeIf { it.isNotBlank() }
                            ?: stringResource(R.string.reminder_alert_fallback),
                        style = MaterialTheme.typography.bodyMedium,
                        color = Muted,
                        modifier = Modifier.padding(top = 4.dp),
                    )
                }
            },
            confirmButton = {
                TextButton(onClick = {
                    val assetId = reminder.assetId
                    dueAlert = null
                    nav.navigate(LocalRoutes.asset(assetId))
                }) {
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
}

private fun NavHostController.navigateTop(route: String) {
    navigate(route) {
        popUpTo(graph.findStartDestination().id) { saveState = true }
        launchSingleTop = true
        restoreState = true
    }
}

private data class LocalTab(val route: String, val label: Int, val icon: ImageVector)

private val localTabs = listOf(
    LocalTab(LocalRoutes.HOME, R.string.nav_home, Icons.Outlined.Home),
    LocalTab(LocalRoutes.ASSETS, R.string.nav_assets, Icons.AutoMirrored.Outlined.List),
    LocalTab(LocalRoutes.REMINDERS, R.string.local_nav_reminders, Icons.Outlined.Alarm),
    LocalTab(LocalRoutes.SETTINGS, R.string.local_nav_settings, Icons.Outlined.Settings),
)

@Composable
private fun LocalBottomBar(current: String?, onNavigate: (String) -> Unit) {
    Column(Modifier.background(Ivory)) {
        Box(
            Modifier
                .fillMaxWidth()
                .height(1.dp)
                .background(Line),
        )
        NavigationBar(containerColor = Ivory, tonalElevation = 0.dp) {
            localTabs.forEach { tab ->
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
