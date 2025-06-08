package com.yoonchae.yomikiri

import android.content.Context
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import uniffi.yomikiri_backend_uniffi.RustDatabase

class AppEnvironment(val context: Context) {
    private var db: RustDatabase? = null
    private var backendManager: BackendManager? = null
    private val backendMutex = Mutex()

    fun getDb(): RustDatabase {
        return db ?: createRustDatabase(context).also { db = it }
    }

    suspend fun getBackend(): BackendManager {
        return backendManager ?: backendMutex.withLock {
            backendManager ?: BackendManager.new(this).also { backendManager = it }
        }
    }
}