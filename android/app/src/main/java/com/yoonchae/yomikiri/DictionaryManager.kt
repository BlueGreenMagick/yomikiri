package com.yoonchae.yomikiri

import android.util.Log
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import uniffi.yomikiri_backend_uniffi.DownloadDictionaryResult
import uniffi.yomikiri_backend_uniffi.createDictionary
import uniffi.yomikiri_backend_uniffi.dictSchemaVer
import uniffi.yomikiri_backend_uniffi.downloadJmdict
import uniffi.yomikiri_backend_uniffi.downloadJmnedict
import java.io.File


private const val TAG = "Yomikiri::DictionaryManager"

class DictionaryManager(val appEnv: AppEnvironment) {
    private fun getFile(): File {
        val context = appEnv.context
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

    private fun updateDictionary(): Boolean {
        val dir = getFilesDirectory()
        val db = appEnv.getDb()

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
        return true
    }


    private fun getFilesDirectory(): File {
        return File(appEnv.context.filesDir, "yomikiri").apply { mkdirs() }
    }
    
    companion object {
        suspend fun getFile(appEnv: AppEnvironment): File = withContext(Dispatchers.IO) {
            DictionaryManager(appEnv).getFile()
        }

        /**
         * Update dictionary with ETag-based conditional downloads
         */
        suspend fun update(appEnv: AppEnvironment): Boolean = withContext(Dispatchers.IO) {
            DictionaryManager(appEnv).updateDictionary()
        }
    }
}