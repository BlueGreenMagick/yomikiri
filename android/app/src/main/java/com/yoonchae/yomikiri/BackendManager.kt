package com.yoonchae.yomikiri

import android.util.Log
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import uniffi.yomikiri_backend_uniffi.RustBackend

private const val TAG = "Yomikiri::Backend"


class BackendManager(val rustBackend: RustBackend) {
    // Operate on rust backend in the main thread
    suspend inline fun <reified T>withBackend(crossinline block: (backend: RustBackend) -> T) = withContext(Dispatchers.Default) {
        block(rustBackend)
    }

    companion object {
        suspend fun new(appEnv: AppEnvironment): BackendManager {
            val dictFile = DictionaryManager.getFile(appEnv)
            return withContext(Dispatchers.Default) {
                val rustBackend = RustBackend(dictFile.absolutePath)
                Log.d(TAG, "Finished creating backend")
                BackendManager(rustBackend)
            }
        }
    }
}