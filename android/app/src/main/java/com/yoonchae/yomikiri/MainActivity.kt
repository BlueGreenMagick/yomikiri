package com.yoonchae.yomikiri

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.outlined.Star
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
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
fun AppContent(appEnv: AppEnvironment) {
    var isSidebarVisible by remember { mutableStateOf(false) }

    Box(modifier = Modifier.fillMaxSize()) {
        Scaffold(
            topBar = { 
                NavigationHeader(
                    title = "Internet", 
                    actions = arrayOf(
                        NavigationAction(Icons.Outlined.Star, "Bookmark", {}),
                        NavigationAction(Icons.Filled.MoreVert, "More", {})
                    ),
                    onMenuClick = { isSidebarVisible = true }
                ) 
            },
            modifier = Modifier.fillMaxSize()
        ) { innerPadding ->
            MainView(
                appEnv = appEnv,
                modifier = Modifier.padding(innerPadding)
            )
        }

        NavigationSidebar(
            isVisible = isSidebarVisible,
            onDismiss = { isSidebarVisible = false },
            onSettingsClick = { 
                // TODO: Handle settings click
                isSidebarVisible = false
            },
            onHelpClick = { 
                // TODO: Handle help click
                isSidebarVisible = false
            }
        )
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