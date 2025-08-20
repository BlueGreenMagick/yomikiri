package com.yoonchae.yomikiri

import android.annotation.SuppressLint
import android.content.Context
import android.util.Log
import android.view.ViewGroup
import android.webkit.CookieManager
import android.webkit.WebSettings
import android.webkit.WebView
import androidx.activity.compose.BackHandler
import androidx.activity.compose.LocalOnBackPressedDispatcherOwner
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
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

// Cache for webview instances to avoid recreation
private val webViewCache = mutableMapOf<String, WebView>()

@Composable
fun YomikiriWebView(
    appEnv: AppEnvironment,
    modifier: Modifier = Modifier,
    webViewKey: String = "default",
    setup: (webview: WebView) -> Unit,
) {
    var webView: WebView? =
        remember(webViewKey) {
            webViewCache[webViewKey]
        }

    Log.d(TAG, "render")

    val context = LocalContext.current
    val backDispatcher = LocalOnBackPressedDispatcherOwner.current?.onBackPressedDispatcher

    BackHandler {
        if (webView?.canGoBack() == true) {
            webView?.goBack()
        } else {
            backDispatcher?.onBackPressed()
        }
    }

    AndroidView(
        factory = {
            webViewCache.getOrPut(webViewKey) {
                WebView(it).apply {
                    val wv = this
                    webView = wv
                    layoutParams =
                        ViewGroup.LayoutParams(
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

                    if (WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) {
                        WebViewCompat.addWebMessageListener(this, "__yomikiriInterface", setOf("*")) { _, message, _, _, replyProxy ->
                            Log.d(TAG, "Received message: ${message.data}")
                            val jsonMessage = message.data
                            if (jsonMessage == null) {
                                Log.e(TAG, "No message was passed from webview")
                            } else {
                                CoroutineScope(Dispatchers.Main).launch {
                                    val response = handleWebMessage(context, appEnv, jsonMessage)
                                    Log.d(TAG, "Sent: $response")
                                    replyProxy.postMessage(response)
                                }
                            }
                        }
                    }

                    setup(wv)
                }
            }
        },
        update = { cachedWebView ->
            webView = cachedWebView
            // Update setup when view is reused
            setup(cachedWebView)
        },
        onRelease = {
            // Don't destroy the webview, keep it in cache
        },
        modifier = modifier.fillMaxSize(),
    )
}

private suspend fun handleWebMessage(
    context: Context,
    appEnv: AppEnvironment,
    jsonMessage: String,
): String {
    val msg = Json.decodeFromString<RequestMessage>(jsonMessage)
    val builder = ResponseBuilder(msg.id)
    val db = appEnv.db

    return try {
        when (msg.key) {
            "versionInfo" -> {
                val value = BuildConfig.VERSION_NAME
                builder.success(value)
            }
            "setStoreBatch" -> {
                db.setRawStoreBatch(msg.request)
                builder.success(Unit)
            }
            "getStoreBatch" -> {
                val value = db.getRawStoreBatch(msg.request)
                builder.jsonSuccess(value)
            }
            "ankiGetInfo" -> {
                val result = AnkiApi.getInfo(context)
                builder.success(result)
            }
            "ankiCheckConnection" -> {
                val result = AnkiApi.checkConnection(context)
                builder.success(result)
            }
            "ankiAddNote" -> {
                val note = Json.decodeFromString<AnkiNote>(msg.request)
                val result = AnkiApi.addNote(context, note)
                builder.success(result)
            }
            "runApp" -> {
                val value = appEnv.backendManager.withBackend { backend -> backend.runApp(msg.request) }
                builder.jsonSuccess(value)
            }
            else -> {
                val value = appEnv.backendManager.withBackend { backend -> backend.run(msg.key, msg.request) }
                builder.jsonSuccess(value)
            }
        }
    } catch (e: BackendException) {
        builder.fail(e.json())
    } catch (e: Exception) {
        builder.fail(e.message ?: "Unknown error")
    }
}

@Serializable
data class RequestMessage(
    val id: Int,
    val key: String,
    val request: String,
)

class ResponseBuilder(
    val id: Int,
) {
    @Serializable
    @ExperimentalSerializationApi
    data class SuccessfulResponseMessage(
        val id: Int,
        val resp: String,
        @EncodeDefault
        val success: Boolean = true,
    )

    @Serializable
    @ExperimentalSerializationApi
    data class FailedResponseMessage(
        val id: Int,
        val error: String,
        @EncodeDefault
        val success: Boolean = false,
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
