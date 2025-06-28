package com.yoonchae.yomikiri

import android.graphics.Bitmap
import android.util.Log
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
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
import androidx.webkit.WebViewCompat
import androidx.webkit.WebViewFeature
import com.yoonchae.yomikiri.ui.theme.YomikiriTheme
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

private const val TAG = "Yomikiri::InternetView"

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
    InternetViewLayout(onMenuClick = onMenuClick) { innerPadding ->
        YomikiriWebView(appEnv = appEnv, modifier = Modifier.padding(innerPadding)) { webview ->
            webview.apply {
                webViewClient =
                    object : WebViewClient() {
                        override fun shouldOverrideUrlLoading(
                            view: WebView?,
                            request: WebResourceRequest?,
                        ): Boolean = false

                        override fun onPageStarted(
                            view: WebView?,
                            url: String?,
                            favicon: Bitmap?,
                        ) {
                            if (url != null) {
                                appEnv.db.setSavedUrl(url)
                            }
                            super.onPageStarted(view, url, favicon)
                        }
                    }

                if (WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT)) {
                    val textContent =
                        context.assets.open("main/res/content.js").bufferedReader().use {
                            it.readText()
                        }
                    WebViewCompat.addDocumentStartJavaScript(
                        this,
                        textContent,
                        setOf("*"),
                    )
                } else {
                    Log.e(TAG, "WebViewFeature.DOCUMENT_START_SCRIPT not supported")
                }

                CoroutineScope(Dispatchers.Main).launch {
                    val storedUrl = appEnv.db.getSavedUrl() ?: "https://syosetu.com"
                    webview.loadUrl(storedUrl)
                }
            }
        }
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
