package com.yoonchae.yomikiri

import android.content.Context
import uniffi.yomikiri_backend_uniffi.RustDatabase

class AppEnvironment(
    context: Context,
) {
    val context: Context = context.applicationContext

    val db: RustDatabase = createRustDatabase(this.context)
    val backendManager: BackendManager = BackendManager(this.context, db)

    suspend fun close() {
        db.close()
        backendManager.close()
    }
}
