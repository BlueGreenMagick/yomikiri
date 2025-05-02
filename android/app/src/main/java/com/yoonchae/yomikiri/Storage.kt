package com.yoonchae.yomikiri

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import kotlinx.serialization.KSerializer
import kotlinx.serialization.json.Json
import kotlinx.serialization.serializer

private val Context.storageStore: DataStore<Preferences> by preferencesDataStore(
    name = "storage",
)

/**
 * All values are stored as JSON so that
 * 1) non primitives can be saved to storage easily
 * 2) kotlin and web can both access the same storage values
 */
class Storage(val store: DataStore<Preferences>) {
    val config by lazy { propertyJson<Unit>("config", "{}") }
    val savedURL by lazy { property<String>("savedURL", "https://syosetu.com")}

    constructor(context: Context): this(context.storageStore)

    private inline fun <reified T>property(key: String, default: T): StorageValue<T> {
        val serializer = serializer<T>()
        val defaultJson = Json.encodeToString(serializer, default)
        return StorageValue(store, serializer, key, defaultJson)
    }

    private inline fun <reified T> propertyJson(key: String, defaultJson: String): StorageValue<T> {
        return StorageValue(store, serializer<T>(), key, defaultJson)
    }

    class StorageValue<T>(private val store: DataStore<Preferences>, private val serializer: KSerializer<T>, private val key: String, val defaultJson: String ) {
        suspend fun setJson(json: String) {
            store.edit { storage ->
                storage[stringPreferencesKey(key)] = json
            }
        }

        suspend fun getJson(): String {
            return store.data.map { storage -> storage[stringPreferencesKey(key)] }.first()
                ?: defaultJson
        }


        suspend fun set(value: T) {
            val json = Json.encodeToString(serializer, value)
            this.setJson(json)
        }

        suspend fun get(): T {
            val json = this.getJson()
            return Json.decodeFromString(serializer, json)
        }
    }
}