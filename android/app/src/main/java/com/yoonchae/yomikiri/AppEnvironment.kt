package com.yoonchae.yomikiri

import android.content.Context
import uniffi.yomikiri_backend_uniffi.RustDatabase

class AppEnvironment(val context: Context) {
    val db: RustDatabase = createRustDatabase(context)
    val backendManager: BackendManager = BackendManager(context)
}