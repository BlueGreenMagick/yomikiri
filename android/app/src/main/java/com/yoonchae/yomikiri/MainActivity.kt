package com.yoonchae.yomikiri

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.outlined.Star
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.tooling.preview.Preview
import com.yoonchae.yomikiri.ui.theme.YomikiriTheme


class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val appEnv = AppEnvironment(this)

        enableEdgeToEdge()
        setContent {
            YomikiriTheme {
                Scaffold(
                    topBar = { NavigationHeader("Internet", arrayOf(
                        NavigationAction(Icons.Outlined.Star, "Bookmark", {}),
                        NavigationAction(Icons.Filled.MoreVert, "More", {})
                    )) },
                    modifier = Modifier.fillMaxSize()
                ) { innerPadding ->
                    MainView(
                        appEnv=appEnv,
                        modifier = Modifier.padding(innerPadding)
                    )
                }
            }
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