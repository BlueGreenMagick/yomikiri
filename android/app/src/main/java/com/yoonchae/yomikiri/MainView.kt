package com.yoonchae.yomikiri

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.DrawerState
import androidx.compose.material3.DrawerValue
import androidx.compose.material3.ModalNavigationDrawer
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.rememberDrawerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import com.yoonchae.yomikiri.ui.theme.YomikiriTheme
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@Composable
private fun MainViewLayout(
    currentView: NavigationView,
    drawerState: DrawerState,
    changeDrawerState: (NavigationView) -> Unit,
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit,
) {
    ModalNavigationDrawer(
        drawerState = drawerState,
        gesturesEnabled = drawerState.isOpen,
        drawerContent = {
            NavigationSidebar(
                onNavigate = changeDrawerState,
                selectedView = currentView,
            )
        },
        modifier = modifier,
    ) {
        content()
    }
}

@Composable
fun MainView(
    appEnv: AppEnvironment,
    modifier: Modifier = Modifier,
) {
    val drawerState = rememberDrawerState(DrawerValue.Closed)
    val scope = rememberCoroutineScope()

    var currentView by remember { mutableStateOf(NavigationView.INTERNET) }

    // Load saved navigation state on startup
    LaunchedEffect(Unit) {
        withContext(Dispatchers.IO) {
            val savedView = appEnv.db.uniffiGetAndroidCurrentView()
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
            appEnv.db.uniffiSetAndroidCurrentView(currentView.name)
        }
    }

    MainViewLayout(
        currentView = currentView,
        drawerState = drawerState,
        changeDrawerState = { view ->
            currentView = view
            scope.launch { drawerState.close() }
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
            NavigationView.HELP -> {
                // TODO: Implement help view
            }
        }
    }
}

@Preview(showBackground = true)
@Composable
fun MainViewPreview() {
    YomikiriTheme {
        var currentView by remember { mutableStateOf(NavigationView.INTERNET) }
        val drawerState = rememberDrawerState(DrawerValue.Closed)
        val scope = rememberCoroutineScope()
        MainViewLayout(currentView = currentView, drawerState = drawerState, changeDrawerState = { view ->
            currentView = view
            scope.launch { drawerState.close() }
        }) {
            Scaffold(
                topBar = {
                    NavigationHeader(
                        title = currentView.name,
                        actions = emptyArray(),
                        onMenuClick = { scope.launch { drawerState.open() } },
                    )
                },
                containerColor = MaterialTheme.colorScheme.primaryContainer,
            ) { paddingValues ->
                Box(
                    contentAlignment = androidx.compose.ui.Alignment.Center,
                    modifier = Modifier.fillMaxSize().padding(paddingValues),
                ) {
                    Text("Preview: ${currentView.name}")
                }
            }
        }
    }
}
