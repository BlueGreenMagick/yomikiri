package com.yoonchae.yomikiri

import android.annotation.SuppressLint
import android.content.Context
import android.content.SharedPreferences
import android.util.Log
import android.view.ViewGroup
import android.webkit.CookieManager
import android.webkit.WebResourceRequest
import androidx.webkit.WebViewCompat
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
import androidx.core.content.edit
import androidx.webkit.WebViewFeature
import kotlinx.serialization.EncodeDefault
import kotlinx.serialization.ExperimentalSerializationApi
import java.io.IOException
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import uniffi.yomikiri_backend_uniffi.BackendException
import uniffi.yomikiri_backend_uniffi.RustBackend
import java.io.File
import com.yoonchae.yomikiri.BuildConfig

private const val TAG = "YomikiriWebViewLog"
private const val CONFIG_FILE_NAME = "config"


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

            webViewClient = object : WebViewClient() {
                override fun shouldOverrideUrlLoading(
                    view: WebView?,
                    request: WebResourceRequest?
                ): Boolean {
                    return false
                }
            }

            val backend = initializeBackend(context)
            Log.d("MessageDelegate", "Initialized Backend")

            if (WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) {
                WebViewCompat.addWebMessageListener(this, "__yomikiriInterface", setOf("*"), {
                    _, message, _, _, replyProxy ->
                    Log.d(TAG, "Received message: ${message.data}")
                    val jsonMessage = message.data
                    if (jsonMessage == null) {
                        Log.e(TAG, "No message was passed from webview")
                    } else {
                        val msg = Json.decodeFromString<RequestMessage>(jsonMessage)
                        val builder = ResponseBuilder(msg.id)

                        val response = try {
                            when (msg.key) {
                                "versionInfo" -> {
                                    val value = BuildConfig.VERSION_NAME
                                    builder.success(value)
                                }
                                "loadConfig" -> {
                                    val preferences = context.getSharedPreferences(CONFIG_FILE_NAME, Context.MODE_PRIVATE)
                                    val value = preferences.getString("config", "{}")
                                    builder.success(value)
                                }
                                "saveConfig" -> {
                                    val preferences = context.getSharedPreferences(CONFIG_FILE_NAME, Context.MODE_PRIVATE)
                                    preferences.edit {
                                        putString("config", msg.request)
                                    }
                                    builder.success(Unit)
                                }
                                else -> {
                                    val value = backend.run(msg.key, msg.request)
                                    builder.success(value)
                                }
                            }
                        } catch (e: BackendException) {
                            builder.fail(e.json())
                        } catch (e: Exception){
                            builder.fail(e.message ?: "Unknown error")
                        }

                        Log.d(TAG, "Sent: $response")
                        replyProxy.postMessage(response)
                    }
                })
            }
        }
    }, update = {
        it.loadUrl("https://syosetu.com")
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
    inline fun <reified T> fail(err: T): String {
        val msg = FailedResponseMessage(id, Json.encodeToString(err))
        return Json.encodeToString(msg)
    }
}

fun initializeBackend(context: Context): RustBackend {
    val assetManager = context.assets
    val inputStream = assetManager.open("dictionary/english.yomikiridict")
    val dictDir = File(context.filesDir, "dict").apply { mkdirs() }
    val outputFile = File(dictDir, "english.yomikiridict")

    // TODO Copy only when needed!
    inputStream.use { input ->
        outputFile.outputStream().use { output ->
            input.copyTo(output)
        }
    }
    Log.d(TAG, "Copied file to directory")

    try {
        return RustBackend(outputFile.path)
    }  catch (e: BackendException) {
        Log.e(TAG, "Failed to initialize backend: ${e.json()}")
        throw e
    }
}