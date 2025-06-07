package com.yoonchae.yomikiri

import android.content.Context
import uniffi.yomikiri_backend_uniffi.RustDatabase

class AppEnvironment(val context: Context) {
    private var db: RustDatabase? = null

    fun getDb(): RustDatabase {
        return db ?: createRustDatabase(context).also { db = it }
    }
}