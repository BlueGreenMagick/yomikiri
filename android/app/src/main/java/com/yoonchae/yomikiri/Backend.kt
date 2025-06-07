package com.yoonchae.yomikiri

import android.content.Context
import android.util.Log
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import uniffi.yomikiri_backend_uniffi.*
import java.io.File

private const val TAG = "YomikiriBackend"


class Backend(private val context: Context) {
    val db: RustDatabase
    val rust by lazy { runCatching { this.createRustBackend() } }
    
    init {
        db = createRustDatabase(context)
    }

    /**
     * Creates RustBackend instance using the dictionary file
     */
    private fun createRustBackend(): RustBackend {
        val dictFile = getDictFile()
        val backend = RustBackend(dictFile.absolutePath)
        Log.d(TAG, "Finished creating backend")
        return backend
    }


    /**
     * Gets the dictionary file path, copying from assets if needed
     */
    private fun getDictFile(): File {
        val dictDir = File(context.filesDir, "dict").apply { mkdirs() }
        val dictFile = File(dictDir, "english.yomikiridict")

        if (dictFile.exists()) {
            Log.d(TAG, "Using existing dictionary file: ${dictFile.absolutePath}")
            return dictFile
        }

        // Copy from assets if file doesn't exist
        Log.d(TAG, "Dictionary file not found, copying from assets")
        val assetManager = context.assets
        assetManager.open("dictionary/english.yomikiridict").use { input ->
            dictFile.outputStream().use { output ->
                input.copyTo(output)
            }
        }

        Log.d(TAG, "Copied dictionary file to: ${dictFile.absolutePath}")
        return dictFile
    }
    
    /**
     * Update dictionary with ETag-based conditional downloads
     */
    suspend fun updateDictionary(): Boolean = withContext(Dispatchers.IO) {
        val dir = getFilesDirectory()
        
        // Download JMDict with ETag check
        val jmdictResult = downloadJmdict(dir.absolutePath, db.getJmdictEtag())
        if (jmdictResult is DownloadDictionaryResult.Replace) {
            db.setJmdictEtag(jmdictResult.etag)
        }
        
        // Download JMNedict with ETag check
        val jmnedictResult = downloadJmnedict(dir.absolutePath, db.getJmnedictEtag())
        if (jmnedictResult is DownloadDictionaryResult.Replace) {
            db.setJmnedictEtag(jmnedictResult.etag)
        }
        
        var error: Exception? = null
        try {
            createDictionary(dir.absolutePath)
            db.setDictSchemaVer(dictSchemaVer())
        } catch (e: Exception) {
            error = e
        }
        
        error?.let { throw it }
        true
    }
    
    private fun getFilesDirectory(): File {
        return File(context.filesDir, "yomikiri").apply { mkdirs() }
    }
}

/**
 * Creates RustDatabase instance with proper Android storage paths
 */
private fun createRustDatabase(context: Context): RustDatabase {
    Log.d(TAG, "Creating database start")
    
    val filesDir = File(context.filesDir, "yomikiri").apply { mkdirs() }
    val dbPath = File(filesDir, "db.sql")
    
    val database = RustDatabase.open(dbPath.absolutePath)
    val dbVer = database.getVersion()
    
    if (dbVer == 0u) {
        migrateDatabaseFrom0(database, context)
    }
    
    Log.d(TAG, "Creating database end")
    return database
}

private fun migrateDatabaseFrom0(db: RustDatabase, context: Context) {
    Log.d(TAG, "Migrate database v0 start")
    
    val data = MigrateFromV0Data(
        webConfig = null,
        jmdictEtag = null,
        jmnedictEtag = null,
        dictSchemaVer = null
    )
    
    db.migrateFrom0(data)
    Log.d(TAG, "Migrate database v0 end")
}

/**
 * Application context provider for global access
 */
object ApplicationContext {
    private lateinit var appContext: Context
    
    fun initialize(context: Context) {
        appContext = context.applicationContext
    }
    
    fun get(): Context {
        return appContext
    }
}
