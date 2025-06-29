package com.yoonchae.yomikiri

import android.content.Context
import com.ichi2.anki.api.AddContentApi
import kotlinx.serialization.Serializable

@Serializable
data class AnkiNote(
    val deck: String,
    val notetype: String,
    val fields: List<AnkiField>,
    val tags: String,
)

@Serializable
data class AnkiField(
    val name: String,
    val value: String,
)

@Serializable
data class AnkiInfo(
    val decks: List<String>,
    val notetypes: List<AnkiNotetypeInfo>,
)

@Serializable
data class AnkiNotetypeInfo(
    val name: String,
    val fields: List<String>,
)

object AnkiApi {
    fun getInfo(context: Context): AnkiInfo {
        val packageName =
            AddContentApi.getAnkiDroidPackageName(context)
                ?: throw Exception("AnkiDroid is not installed")

        val api = AddContentApi(context)

        val deckNames = api.deckList?.values?.toList() ?: emptyList()

        val modelList = api.modelList
        val notetypes =
            modelList?.map { (modelId, modelName) ->
                val fieldNames = api.getFieldList(modelId) ?: emptyArray()
                AnkiNotetypeInfo(name = modelName, fields = fieldNames.toList())
            } ?: emptyList()

        return AnkiInfo(decks = deckNames, notetypes = notetypes)
    }

    fun checkConnection(context: Context) {
        val packageName =
            AddContentApi.getAnkiDroidPackageName(context)
                ?: throw Exception("AnkiDroid is not installed")

        // Try to create API instance to verify connection
        AddContentApi(context)
    }

    fun addNote(
        context: Context,
        note: AnkiNote,
    ): Boolean {
        val packageName =
            AddContentApi.getAnkiDroidPackageName(context)
                ?: throw Exception("AnkiDroid is not installed")

        val api = AddContentApi(context)

        // Find or create deck
        val deckList = api.deckList
        var deckId = deckList?.entries?.find { it.value == note.deck }?.key
        if (deckId == null) {
            throw Exception("Deck not found: ${note.deck}")
        }

        // Find or create note type (model)
        val modelList = api.modelList
        var modelId = modelList?.entries?.find { it.value == note.notetype }?.key
        if (modelId == null) {
            throw Exception("Notetype not found: ${note.notetype}")
        }

        // Prepare field values
        val fieldValues = note.fields.map { it.value }.toTypedArray()

        // Prepare tags
        val tags =
            if (note.tags.isNotEmpty()) {
                setOf(note.tags)
            } else {
                null
            }

        // Add note
        val noteId =
            api.addNote(modelId, deckId, fieldValues, tags)
                ?: throw Exception("Failed to add note to Anki")

        return true
    }
}
