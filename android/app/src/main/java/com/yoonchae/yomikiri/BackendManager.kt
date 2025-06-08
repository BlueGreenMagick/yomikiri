package com.yoonchae.yomikiri

import android.content.Context
import android.util.Log
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import uniffi.yomikiri_backend_uniffi.RustBackend

private const val TAG = "Yomikiri::BackendManager"


class BackendManager(val context: Context) {
    private var backendCache: RustBackend? = null
    private val backendMutex = Mutex()

    /**
     * Operate on backend instance.
     *
     * Passed lambda runs in Dispatchers.Default coroutine.
     */
    suspend fun<T> withBackend(block: (backend: RustBackend) -> T) = withContext(Dispatchers.Default) {
        val backend = getBackend()
        block(backend)
    }

    /**
     * Closes and clears the backend instance if it exists or is being created.
     *
     * This method acquires the backend mutex to ensure thread safety,
     * preventing concurrent creation or access to the backend during closure.
     * After calling this method, the backend will be set to null.
     */
    suspend fun close() {
        backendMutex.withLock {
            backendCache?.close()
            backendCache = null
        }
    }

    // Get backend instance, or create it if it doesn't exist yet.
    // If instance is already being created, it waits for the previous invocation then returns the result
    private suspend fun getBackend(): RustBackend {
        return backendCache ?: backendMutex.withLock {
            backendCache ?: createBackend(context).also { backendCache = it }
        }
    }
}


private suspend fun createBackend(context: Context): RustBackend {
    Log.d(TAG, "Create backend start")
    val dictFile = DictionaryManager.getFile(context)
    val backend = RustBackend(dictFile.absolutePath)
    Log.d(TAG, "Create backend finish")
    return backend
}