package com.yoonchae.yomikiri

import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.viewinterop.AndroidView

@Composable
fun YomikiriWebView(modifier: Modifier = Modifier) {
    AndroidView(factory={
        WebView(it).apply {
            this.webViewClient = YomikiriWebViewClient()
        }
    }, update={
        it.loadUrl("https://www.google.com")
    })
}

class YomikiriWebViewClient: WebViewClient() {}