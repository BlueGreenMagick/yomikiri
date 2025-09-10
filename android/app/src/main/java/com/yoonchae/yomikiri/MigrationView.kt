package com.yoonchae.yomikiri

import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.webkit.WebViewAssetLoader

@Composable
fun MigrationView(
    appEnv: AppEnvironment,
    onMigrationComplete: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val additionalMessageHandler: AdditionalMessageHandler =
        { msg, builder ->
            when (msg.key) {
                "finishMigration" -> {
                    onMigrationComplete()
                    builder.success(Unit)
                }
                else -> null
            }
        }

    YomikiriWebView(
        appEnv = appEnv,
        modifier = modifier.fillMaxSize(),
        webViewKey = "migration",
    ) { webview ->
        webview.apply {
            // Create WebViewAssetLoader to serve assets via HTTPS
            val assetLoader =
                WebViewAssetLoader
                    .Builder()
                    .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(context))
                    .build()

            // Set custom WebViewClient to handle asset loading
            webViewClient =
                object : WebViewClient() {
                    override fun shouldInterceptRequest(
                        view: WebView?,
                        request: WebResourceRequest?,
                    ): WebResourceResponse? = assetLoader.shouldInterceptRequest(request?.url)
                }

            // Load migration page via HTTPS domain to avoid CORS issues
            val migrationHtmlPath = "https://appassets.androidplatform.net/assets/migrate.html"
            webview.loadUrl(migrationHtmlPath)
        }
    }
}
