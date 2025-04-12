package com.yoonchae.yomikiri

import android.annotation.SuppressLint
import android.graphics.Bitmap
import android.util.Log
import android.view.ViewGroup
import android.webkit.CookieManager
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.compose.BackHandler
import androidx.activity.compose.LocalOnBackPressedDispatcherOwner
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.viewinterop.AndroidView
import java.io.IOException

private const val TAG = "YomikiriWebView"
private const val URL_SCHEME = "yomikiri"
private const val SCRIPT_URL = "${URL_SCHEME}://main/res/website.js"

@Composable
fun YomikiriWebView(modifier: Modifier = Modifier) {
    var webView: WebView? = remember { null }
    Log.d(TAG, "render")

    val backDispatcher = LocalOnBackPressedDispatcherOwner.current?.onBackPressedDispatcher

    BackHandler {
        if (webView?.canGoBack() == true) {
            webView?.goBack()
        } else {
            backDispatcher?.onBackPressed()
        }
    }

    AndroidView(factory = {
        WebView(it).apply {
            val wv = this
            webView = wv
            layoutParams = ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT,
            )

            settings.apply {
                useWideViewPort = true
                @SuppressLint("SetJavaScriptEnabled")
                javaScriptEnabled = true
                allowFileAccess = true
                allowContentAccess = true
                loadWithOverviewMode = true
                builtInZoomControls = true
                displayZoomControls = false
                setSupportZoom(true)
                domStorageEnabled = true
                cacheMode = WebSettings.LOAD_DEFAULT
                mediaPlaybackRequiresUserGesture = false
                setGeolocationEnabled(true)
                offscreenPreRaster = true // should only be true if this webview is visible
            }

            CookieManager.getInstance().apply {
                setAcceptCookie(true)
                setAcceptThirdPartyCookies(wv, true)
            }

            webViewClient = object : WebViewClient() {
                override fun shouldOverrideUrlLoading(
                    view: WebView?,
                    request: WebResourceRequest?
                ): Boolean {
                    if (view == null || request?.url == null) {
                        return false
                    }
                    Log.d(TAG, "shouldOverrideUrlLoading: ${request.url}")
                    return false
                }

                /*
                    Not invoked for
                    javascript:, blob:, file:///android_asset/, file:///android_res/
                */
                override fun shouldInterceptRequest(
                    view: WebView?,
                    request: WebResourceRequest?
                ): WebResourceResponse? {
                    if (view == null || request?.url == null) {
                        return null
                    }

                    val url = request.url

                    if (request.url.scheme != URL_SCHEME) {
                        return null
                    }

                    Log.d(TAG, "shouldInterceptRequest: ${url.toString()}")
                    val path = url.path
                    if (url.authority == "main" && path != null) {
                        Log.d(TAG, "pass resource: ${path.toString()}")
                        try {
                            return WebResourceResponse(
                                "application/javascript",
                                "UTF-8",
                                context.assets.open("main${path}")
                            )
                        } catch (ex: IOException) {
                            return WebResourceResponse("text/plain", "UTF-8", 404, "Not Found", null, null)
                        }
                    }
                    return null
                }

                override fun onPageFinished(view: WebView?, url: String?) {
                    Log.d(TAG, "onPageFinished: ${url?.toString()}")
                    Log.d(TAG, "inject script into view")
                    if (view != null) {
                        injectScript(view)
                    }
                }
            }
        }
    }, update = {
        it.loadUrl("https://www.google.com")
    }, onRelease = {
        webView = null
    },
        modifier = modifier.fillMaxSize()
    )
}

fun injectScript(view: WebView) {
    view.evaluateJavascript("""
        (() => {
        const script = document.createElement('script');
        script.src = '${SCRIPT_URL}';
        document.head.appendChild(script);
        })()
    """, {})
}