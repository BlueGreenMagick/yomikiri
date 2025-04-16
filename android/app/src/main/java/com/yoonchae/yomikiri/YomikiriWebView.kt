package com.yoonchae.yomikiri

import android.annotation.SuppressLint
import android.util.Log
import android.view.ViewGroup
import android.webkit.CookieManager
import androidx.webkit.WebViewCompat
import android.webkit.WebSettings
import android.webkit.WebView
import androidx.activity.compose.BackHandler
import androidx.activity.compose.LocalOnBackPressedDispatcherOwner
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.viewinterop.AndroidView
import androidx.webkit.WebViewFeature
import java.io.IOException
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

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

            if (WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT)) {
                val textContent = context.assets.open("main/res/content.js").bufferedReader().use {
                    it.readText()
                }
                WebViewCompat.addDocumentStartJavaScript(
                    this,
                    textContent,
                    setOf("*")
                )
            } else {
                Log.e(TAG, "WebViewFeature.DOCUMENT_START_SCRIPT not supported")
            }


            if (WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) {
                WebViewCompat.addWebMessageListener(this, "__yomikiriInterface", setOf("*"), {
                    _, message, _, _, replyProxy ->
                    Log.d(TAG, "Received message: ${message.data}")
                    val jsonMessage = message.data
                    if (jsonMessage == null) {
                        Log.e(TAG, "No message was passed from webview")
                    } else {
                        val msg = Json.decodeFromString<RequestMessage>(jsonMessage)
                        val responseObj = "Success!"
                        val parsedResponse = SuccessfulResponseMessage(msg.id, Json.encodeToString(responseObj))
                        val jsonResponse = Json.encodeToString(parsedResponse)
                        replyProxy.postMessage(jsonResponse)
                    }
                })
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

@Serializable
data class RequestMessage(val id: Int, val key: String, val request: String)

@Serializable
data class SuccessfulResponseMessage(val id: Int, val resp: String, val success: Boolean = true)

@Serializable
data class FailedResponseMessage(val id: Int, val error: String, val success: Boolean = false)
