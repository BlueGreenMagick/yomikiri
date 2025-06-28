package com.yoonchae.yomikiri

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.MusicNote
import androidx.compose.material.icons.filled.Public
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.tooling.preview.Preview
import com.yoonchae.yomikiri.ui.theme.YomikiriTheme

@Composable
fun InternetViewLayout(
    onMenuClick: () -> Unit,
    content: @Composable (PaddingValues) -> Unit,
) {
    Scaffold(
        topBar = {
            NavigationHeader(
                title = "Internet",
                actions =
                    arrayOf(
                        NavigationAction(Icons.Filled.Public, "Bookmark", {}),
                        NavigationAction(Icons.Filled.MusicNote, "More", {}),
                    ),
                onMenuClick = onMenuClick,
            )
        },
    ) { innerPadding ->
        content(innerPadding)
    }
}

@Composable
fun InternetView(
    appEnv: AppEnvironment,
    onMenuClick: () -> Unit,
) {
    Scaffold(
        topBar = {
            NavigationHeader(
                title = "Internet",
                actions =
                    arrayOf(
                        NavigationAction(Icons.Filled.Public, "Bookmark", {}),
                        NavigationAction(Icons.Filled.MusicNote, "More", {}),
                    ),
                onMenuClick = onMenuClick,
            )
        },
    ) { innerPadding ->
        YomikiriWebView(appEnv = appEnv, modifier = Modifier.padding(innerPadding))
    }
}

@Preview(showBackground = true)
@Composable
fun InternetViewLayoutPreview() {
    YomikiriTheme {
        InternetViewLayout(onMenuClick = {}) { paddingValues ->
            Box(
                modifier =
                    Modifier
                        .fillMaxSize()
                        .padding(paddingValues)
                        .background(Color(0xFFD8D8D8)),
            )
        }
    }
}
