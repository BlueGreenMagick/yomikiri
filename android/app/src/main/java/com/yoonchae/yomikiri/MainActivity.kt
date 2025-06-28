package com.yoonchae.yomikiri

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.MusicNote
import androidx.compose.material.icons.filled.Public
import androidx.compose.material3.DrawerValue
import androidx.compose.material3.ModalNavigationDrawer
import androidx.compose.material3.Scaffold
import androidx.compose.material3.rememberDrawerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.tooling.preview.Preview
import androidx.lifecycle.lifecycleScope
import com.yoonchae.yomikiri.ui.theme.YomikiriTheme
import kotlinx.coroutines.NonCancellable
import kotlinx.coroutines.launch


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


@Composable
fun AppContent(
    appEnv: AppEnvironment,
    modifier: Modifier = Modifier
) {
    val drawerState = rememberDrawerState(DrawerValue.Closed)
    val scope = rememberCoroutineScope()

    ModalNavigationDrawer(
        drawerState = drawerState,
        drawerContent = {
            NavigationSidebar(
                onSettingsClick = { 
                    // TODO: Handle settings click
                    scope.launch { drawerState.close() }
                },
                onHelpClick = { 
                    // TODO: Handle help click
                    scope.launch { drawerState.close() }
                },
                onDrawerItemClick = { item ->
                    // TODO: Handle navigation item click
                    scope.launch { drawerState.close() }
                }
            )
        },
        modifier = modifier
    ) {
        Scaffold(
            topBar = { 
                NavigationHeader(
                    title = "Internet", 
                    actions = arrayOf(
                        NavigationAction(Icons.Filled.Public, "Bookmark", {}),
                        NavigationAction(Icons.Filled.MusicNote, "More", {})
                    ),
                    onMenuClick = { 
                        scope.launch { drawerState.open() }
                    }
                ) 
            }
        ) { innerPadding ->
            MainView(
                appEnv = appEnv,
                modifier = Modifier.padding(innerPadding)
            )
        }
    }
}

@Composable
fun MainView(appEnv: AppEnvironment, modifier: Modifier = Modifier) {
    YomikiriWebView(appEnv=appEnv,modifier = modifier)
}

@Preview(showBackground = true)
@Composable
fun GreetingMainView() {
    YomikiriTheme {
        MainView(appEnv= AppEnvironment(context= LocalContext.current))
    }
}