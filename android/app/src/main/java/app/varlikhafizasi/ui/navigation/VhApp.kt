package app.varlikhafizasi.ui.navigation

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
import androidx.compose.material.icons.outlined.Explore
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material.icons.outlined.PhotoLibrary
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
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import app.varlikhafizasi.R
import app.varlikhafizasi.data.User
import app.varlikhafizasi.ui.VhViewModel
import app.varlikhafizasi.ui.screens.AddEntryScreen
import app.varlikhafizasi.ui.screens.AssetDetailScreen
import app.varlikhafizasi.ui.screens.ArchiveScreen
import app.varlikhafizasi.ui.screens.AssetsScreen
import app.varlikhafizasi.ui.screens.ExploreScreen
import app.varlikhafizasi.ui.screens.HomeScreen
import app.varlikhafizasi.ui.screens.LoginScreen
import app.varlikhafizasi.ui.screens.NewAssetScreen
import app.varlikhafizasi.ui.screens.NotificationsScreen
import app.varlikhafizasi.ui.screens.ProfileScreen
import app.varlikhafizasi.ui.theme.Forest
import app.varlikhafizasi.ui.theme.Line
import app.varlikhafizasi.ui.theme.Muted
import app.varlikhafizasi.ui.theme.Paper
import app.varlikhafizasi.ui.theme.SageLight
import app.varlikhafizasi.ui.theme.Ivory

private object Routes {
    const val HOME = "home"
    const val ASSETS = "assets"
    const val ARCHIVE = "archive"
    const val EXPLORE = "explore"
    const val PROFILE = "profile"
    const val NOTIFICATIONS = "notifications"
    const val NEW_ASSET = "newAsset"
    const val ASSET_DETAIL = "asset/{id}"
    const val ADD_ENTRY = "addEntry/{assetId}"

    fun asset(id: String) = "asset/$id"
    fun addEntry(id: String) = "addEntry/$id"
}

@Composable
fun VhRoot(vm: VhViewModel) {
    val session by vm.session.collectAsStateWithLifecycle()

    when {
        session.checking -> Splash()
        session.user == null -> LoginScreen(vm, session.error)
        else -> MainNavigator(vm, session.user!!)
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
private fun MainNavigator(vm: VhViewModel, viewer: User) {
    val nav = rememberNavController()
    val backStack by nav.currentBackStackEntryAsState()
    val route = backStack?.destination?.route
    val snackbar = remember { SnackbarHostState() }
    val notice by vm.notice.collectAsStateWithLifecycle()

    LaunchedEffect(notice) {
        val message = notice ?: return@LaunchedEffect
        snackbar.showSnackbar(message)
        vm.consumeNotice()
    }

    val showBar = route in setOf(
        Routes.HOME,
        Routes.ASSETS,
        Routes.ARCHIVE,
        Routes.EXPLORE,
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
            composable(Routes.PROFILE) {
                ProfileScreen(
                    vm = vm,
                    viewer = viewer,
                    onOpenAsset = { nav.navigate(Routes.asset(it)) },
                    onOpenNotifications = { nav.navigate(Routes.NOTIFICATIONS) },
                )
            }
            composable(Routes.NOTIFICATIONS) {
                NotificationsScreen(vm, onBack = { nav.popBackStack() })
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
                    onAddEntry = { nav.navigate(Routes.addEntry(id)) },
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
        }
    }
}

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
                        indicatorColor = SageLight,
                        selectedTextColor = Forest,
                        unselectedTextColor = Muted,
                    ),
                )
            }
        }
    }
}
