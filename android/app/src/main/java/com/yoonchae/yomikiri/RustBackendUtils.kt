package com.yoonchae.yomikiri

import android.util.Log
import uniffi.yomikiri_backend_uniffi.RustBackend

private const val TAG = "Yomikiri::RustBackend"

suspend fun createRustBackend(appEnv: AppEnvironment): RustBackend {
    val dictFile = DictionaryManager.getFile(appEnv)
    val backend = RustBackend(dictFile.absolutePath)
    Log.d(TAG, "Finished creating backend")
    return backend
}