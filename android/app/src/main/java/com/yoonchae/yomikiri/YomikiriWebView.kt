package com.yoonchae.yomikiri

import android.view.ViewGroup
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.viewinterop.AndroidView

@Composable
fun YomikiriWebView(modifier: Modifier = Modifier) {
    AndroidView(factory={
        WebView(it).apply {
            this.webViewClient = YomikiriWebViewClient()
            layoutParams = ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT,
            )
        }
    }, update={
        it.loadUrl("https://www.google.com")
    }, modifier=modifier.fillMaxSize())
}

class YomikiriWebViewClient: WebViewClient() {}