package com.yoonchae.yomikiri

import android.annotation.SuppressLint
import android.graphics.Bitmap
import android.util.Log
import android.view.ViewGroup
import android.webkit.CookieManager
import android.webkit.WebResourceRequest
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
import androidx.webkit.WebViewCompat
import androidx.webkit.WebViewFeature
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.serialization.EncodeDefault
import kotlinx.serialization.ExperimentalSerializationApi
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import uniffi.yomikiri_backend_uniffi.BackendException

private const val TAG = "YomikiriWebViewLog"

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
                supportMultipleWindows()
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



            val backend = Backend(context)
            Log.d("MessageDelegate", "Initialized Backend")

            webViewClient = object : WebViewClient() {
                override fun shouldOverrideUrlLoading(
                    view: WebView?,
                    request: WebResourceRequest?
                ): Boolean {
                    return false
                }

                override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) {
                    if (url != null) {
                        backend.db.setSavedUrl(url)
                    }
                    super.onPageStarted(view, url, favicon)
                }
            }

            suspend fun handleWebMessage(jsonMessage: String): String {
                val msg = Json.decodeFromString<RequestMessage>(jsonMessage)
                val builder = ResponseBuilder(msg.id)

                return try {
                    when (msg.key) {
                        "versionInfo" -> {
                            val value = BuildConfig.VERSION_NAME
                            builder.success(value)
                        }
                        "loadConfig" -> {
                            val value = backend.db.getRawStorage("config") ?: "{}"
                            builder.success(value)
                        }
                        "saveConfig" -> {
                            backend.db.setRawStorage("config", msg.request)
                            builder.success(Unit)
                        }
                        else -> {
                            val rustBackend = backend.rust.getOrThrow()
                            val value = rustBackend.run(msg.key, msg.request)
                            builder.jsonSuccess(value)
                        }
                    }
                } catch (e: BackendException) {
                    builder.fail(e.json())
                } catch (e: Exception){
                    builder.fail(e.message ?: "Unknown error")
                }
            }

            if (WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) {
                WebViewCompat.addWebMessageListener(this, "__yomikiriInterface", setOf("*"), {
                    _, message, _, _, replyProxy ->
                    Log.d(TAG, "Received message: ${message.data}")
                    val jsonMessage = message.data
                    if (jsonMessage == null) {
                        Log.e(TAG, "No message was passed from webview")
                    } else {
                        CoroutineScope(Dispatchers.Main).launch {
                            val response = handleWebMessage(jsonMessage)
                            Log.d(TAG, "Sent: $response")
                            replyProxy.postMessage(response)
                        }
                    }
                })
            }

            CoroutineScope(Dispatchers.Main).launch {
                val storedUrl = backend.db.getSavedUrl() ?: "https://syosetu.com"
                wv.loadUrl(storedUrl)
            }
        }
    }, update = {
    }, onRelease = {
        webView = null
    },
        modifier = modifier.fillMaxSize()
    )
}

@Serializable
data class RequestMessage(val id: Int, val key: String, val request: String)

class ResponseBuilder(val id: Int) {
    @Serializable
    @ExperimentalSerializationApi
    data class SuccessfulResponseMessage(
        val id: Int,
        val resp: String,
        @EncodeDefault
        val success: Boolean = true
    )

    @Serializable
    @ExperimentalSerializationApi
    data class FailedResponseMessage(
        val id: Int,
        val error: String,
        @EncodeDefault
        val success: Boolean = false
    )

    @OptIn(ExperimentalSerializationApi::class)
    inline fun <reified T> success(resp: T): String {
        val msg = SuccessfulResponseMessage(id, Json.encodeToString(resp))
        return Json.encodeToString(msg)
    }

    @OptIn(ExperimentalSerializationApi::class)
    fun jsonSuccess(json: String): String {
        val msg = SuccessfulResponseMessage(id, json)
        return Json.encodeToString(msg)
    }

    @OptIn(ExperimentalSerializationApi::class)
    inline fun <reified T> fail(err: T): String {
        val msg = FailedResponseMessage(id, Json.encodeToString(err))
        return Json.encodeToString(msg)
    }
}
