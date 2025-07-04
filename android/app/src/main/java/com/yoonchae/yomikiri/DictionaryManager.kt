package com.yoonchae.yomikiri

import android.content.Context
import android.util.Log
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File

private const val TAG = "Yomikiri::DictionaryManager"

class DictionaryManager(
    val context: Context,
) {
    private fun getFile(): File {
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
        /** Runs on the IO thread */
        suspend fun getFile(context: Context): File =
            withContext(Dispatchers.IO) {
                DictionaryManager(context).getFile()
            }
    }
}
