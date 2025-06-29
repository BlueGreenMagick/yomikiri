package com.yoonchae.yomikiri

import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.tooling.preview.Preview
import androidx.webkit.WebViewAssetLoader
import com.yoonchae.yomikiri.ui.theme.YomikiriTheme

@Composable
fun OptionsViewLayout(
    onMenuClick: () -> Unit,
    content: @Composable (PaddingValues) -> Unit,
) {
    Scaffold(
        topBar = {
            NavigationHeader(
                title = "Settings",
                actions = emptyArray(),
                onMenuClick = onMenuClick,
            )
        },
    ) { innerPadding ->
        content(innerPadding)
    }
}

@Composable
fun OptionsView(
    appEnv: AppEnvironment,
    onMenuClick: () -> Unit,
) {
    OptionsViewLayout(onMenuClick = onMenuClick) { innerPadding ->
        YomikiriWebView(appEnv = appEnv, modifier = Modifier.padding(innerPadding), webViewKey = "options") { webview ->
            webview.apply {
                // Create WebViewAssetLoader to serve assets via HTTPS
                val assetLoader = WebViewAssetLoader.Builder()
                    .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(context))
                    .build()

                // Set custom WebViewClient to handle asset loading
                webViewClient = object : WebViewClient() {
                    override fun shouldInterceptRequest(
                        view: WebView?,
                        request: WebResourceRequest?
                    ): WebResourceResponse? {
                        return assetLoader.shouldInterceptRequest(request?.url)
                    }
                }
                
                // Load options page via HTTPS domain to avoid CORS issues
                val optionsHtmlPath = "https://appassets.androidplatform.net/assets/main/res/options.html"
                webview.loadUrl(optionsHtmlPath)
            }
        }
    }
}

@Preview(showBackground = true)
@Composable
fun OptionsViewLayoutPreview() {
    YomikiriTheme {
        OptionsViewLayout(onMenuClick = {}) { paddingValues ->
            Box(
                modifier =
                    Modifier
                        .fillMaxSize()
                        .padding(paddingValues)
                        .background(Color(0xFFE8E8E8)),
            )
        }
    }
}
