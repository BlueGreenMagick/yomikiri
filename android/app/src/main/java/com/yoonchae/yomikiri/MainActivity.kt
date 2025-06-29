package com.yoonchae.yomikiri

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.material3.DrawerValue
import androidx.compose.material3.ModalNavigationDrawer
import androidx.compose.material3.rememberDrawerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.tooling.preview.Preview
import androidx.lifecycle.lifecycleScope
import com.yoonchae.yomikiri.ui.theme.YomikiriTheme
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.NonCancellable
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class MainActivity : ComponentActivity() {
    private lateinit var appEnv: AppEnvironment

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        appEnv = AppEnvironment(this)

        enableEdgeToEdge()
        setContent {
            YomikiriTheme {
                AppContent(appEnv = appEnv)
            }
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        lifecycleScope.launch(NonCancellable) {
            appEnv.close()
        }
    }
}

enum class NavigationView {
    INTERNET,
    OPTIONS,
}

@Composable
fun AppContent(
    appEnv: AppEnvironment,
    modifier: Modifier = Modifier,
) {
    val drawerState = rememberDrawerState(DrawerValue.Closed)
    val scope = rememberCoroutineScope()

    var currentView by remember { mutableStateOf(NavigationView.INTERNET) }

    // Load saved navigation state on startup
    LaunchedEffect(Unit) {
        withContext(Dispatchers.IO) {
            val savedView = appEnv.db.getAndroidCurrentView()
            currentView =
                try {
                    NavigationView.valueOf(savedView ?: "INTERNET")
                } catch (e: IllegalArgumentException) {
                    NavigationView.INTERNET
                }
        }
    }

    // Save navigation state when it changes
    LaunchedEffect(currentView) {
        withContext(Dispatchers.IO) {
            appEnv.db.setAndroidCurrentView(currentView.name)
        }
    }

    ModalNavigationDrawer(
        drawerState = drawerState,
        gesturesEnabled = drawerState.isOpen,
        drawerContent = {
            NavigationSidebar(
                onSettingsClick = {
                    currentView = NavigationView.OPTIONS
                    scope.launch { drawerState.close() }
                },
                onHelpClick = {
                    // TODO: Handle help click
                    scope.launch { drawerState.close() }
                },
                onDrawerItemClick = { item ->
                    when (item) {
                        "Internet" -> currentView = NavigationView.INTERNET
                        else -> {
                            // TODO: Handle other navigation items
                        }
                    }
                    scope.launch { drawerState.close() }
                },
            )
        },
        modifier = modifier,
    ) {
        when (currentView) {
            NavigationView.INTERNET -> {
                InternetView(appEnv = appEnv, onMenuClick = {
                    scope.launch { drawerState.open() }
                })
            }
            NavigationView.OPTIONS -> {
                OptionsView(appEnv = appEnv, onMenuClick = {
                    scope.launch { drawerState.open() }
                })
            }
        }
    }
}

@Preview(showBackground = true)
@Composable
fun AppContentPreview() {
    YomikiriTheme {
        AppContent(appEnv = AppEnvironment(context = LocalContext.current))
    }
}
