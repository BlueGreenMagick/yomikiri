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
    
    companion object {
        suspend fun getFile(appEnv: AppEnvironment): File = withContext(Dispatchers.Default) {
            DictionaryManager(appEnv).getFile()
        }
    }
}