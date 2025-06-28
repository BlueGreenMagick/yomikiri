package com.yoonchae.yomikiri

import android.content.Context
import android.util.Log
import uniffi.yomikiri_backend_uniffi.MigrateFromV0Data
import uniffi.yomikiri_backend_uniffi.RustDatabase
import java.io.File

private const val TAG = "Yomikiri::RustBackend"

/**
 * Creates RustDatabase instance with proper Android storage paths
 */
fun createRustDatabase(context: Context): RustDatabase {
    Log.d(TAG, "Create database start")

    val filesDir = File(context.filesDir, "yomikiri").apply { mkdirs() }
    val dbPath = File(filesDir, "db.sql")

    val database = RustDatabase.open(dbPath.absolutePath)
    val dbVer = database.getVersion()

    if (dbVer == 0u) {
        migrateDatabaseFrom0(database, context)
    }

    Log.d(TAG, "Create database end")
    return database
}

private fun migrateDatabaseFrom0(
    db: RustDatabase,
    context: Context,
) {
    Log.d(TAG, "Migrate database v0 start")

    val data =
        MigrateFromV0Data(
            webConfig = null,
            jmdictEtag = null,
            jmnedictEtag = null,
            dictSchemaVer = null,
        )

    db.migrateFrom0(data)
    Log.d(TAG, "Migrate database v0 end")
}
