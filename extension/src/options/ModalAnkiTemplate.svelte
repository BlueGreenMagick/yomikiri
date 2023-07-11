<script lang="ts">
  import { AnkiApi } from "@platform/anki";
  import type { NoteData } from "~/ankiNoteBuilder";
  import Config from "~/config";
  import Modal from "./components/Modal.svelte";
  import Utils from "~/utils";
  import { AnkiNoteBuilder } from "~/ankiNoteBuilder";
  import {
    exampleMarkerData,
    exampleTranslatedSentence,
  } from "./exampleMarkerData";

  export let hidden: boolean;

  const [initializePromise, initializeResolve] = Utils.createPromise<void>();
  let initialized = false;
  let previewMode = false;

  let deckNames: string[];
  let notetypeNames: string[];
  let loadedFields: Promise<string[]>;

  let selectedDeck: string;
  let selectedNotetype: string;
  // fieldTemplates should not reload on note type change
  // so accidentally changing note type does not clear all data
  let fieldTemplates: { [name: string]: string };
  let ankiTags: string;

  let invalidDeck: boolean;
  let invalidNotetype: boolean;

  /** load deckNames and notetypeNames */
  async function loadNames() {
    deckNames = await AnkiApi.deckNames();
    notetypeNames = await AnkiApi.notetypeNames();
    const template = await Config.get("anki.template");
    if (template === null) {
      selectedNotetype = notetypeNames[0];
      selectedDeck = deckNames[0];
      fieldTemplates = {};
      ankiTags = "";
    } else {
      selectedDeck = template.deck;
      selectedNotetype = template.notetype;
      fieldTemplates = {};
      for (const field of template.fields) {
        fieldTemplates[field.name] = field.value;
      }
      ankiTags = template.tags;
    }
  }

  async function loadFields(notetype: string, invalid: boolean) {
    if (notetype === undefined) return [];
    if (invalid) {
      const template = await Config.get("anki.template");
      if (template === null) return [];
      return template.fields.map((f) => f.name);
    }
    const fields = await AnkiApi.nodeTypeFields(notetype);
    for (const field of fields) {
      fieldTemplates[field] ??= "";
    }
    return fields;
  }

  async function saveTemplate(
    deck: string,
    notetype: string,
    fields: { [name: string]: string },
    tags: string
  ) {
    if (!initialized) return;
    const template: NoteData = {
      deck,
      notetype,
      fields: [],
      tags,
    };
    const fieldNames = await loadedFields;
    for (const fieldName of fieldNames) {
      template.fields.push({
        name: fieldName,
        value: fields[fieldName] ?? "",
      });
    }
    Config.set("anki.template", template);
  }

  function markerValue(field: string) {
    let marker = fieldTemplates[field] as AnkiNoteBuilder.Marker;
    if (marker === "sentence-translate") {
      return exampleTranslatedSentence;
    } else {
      return AnkiNoteBuilder.markerValue(
        fieldTemplates[field],
        exampleMarkerData
      );
    }
  }

  async function initialize(hidden: boolean) {
    if (hidden) return;
    await loadNames();
    let invalidDeck = !deckNames.includes(selectedDeck);
    let invalidNotetype = !notetypeNames.includes(selectedNotetype);
    loadedFields = loadFields(selectedNotetype, invalidDeck || invalidNotetype);
    initializeResolve();
    initialized = true;
  }

  $: invalidDeck = initialized && !deckNames.includes(selectedDeck);
  $: invalidNotetype = initialized && !notetypeNames.includes(selectedNotetype);
  $: loadedFields = loadFields(
    selectedNotetype,
    invalidDeck || invalidNotetype
  );
  $: saveTemplate(selectedDeck, selectedNotetype, fieldTemplates, ankiTags);
  // Must come last so the above 2 is not be called on initialization
  $: initialize(hidden);
</script>

<Modal title="Anki Template" {hidden} on:close>
  {#await initializePromise}
    <div>Connecting to Anki...</div>
  {:then}
    <div class="selects">
      <div class="item-title">Deck</div>
      <select
        class="item-select"
        bind:value={selectedDeck}
        class:invalid={invalidDeck}
      >
        {#each deckNames as name}
          <option value={name}>{name}</option>
        {/each}
        {#if invalidDeck}
          <option value={selectedDeck}>(Invalid) {selectedDeck}</option>
        {/if}
      </select>
      <div class="item-title">Note Type</div>
      <select
        class="item-select"
        bind:value={selectedNotetype}
        class:invalid={invalidNotetype}
      >
        {#each notetypeNames as name}
          <option value={name}>{name}</option>
        {/each}
        {#if invalidNotetype}
          <option value={selectedNotetype}>(Invalid) {selectedNotetype}</option>
        {/if}
      </select>
    </div>
    <div class="preview-toggle">
      <label for="preview-checkbox" title={exampleMarkerData.scanned.sentence}>
        Preview
      </label>
      <input
        type="checkbox"
        id="preview-checkbox"
        title={exampleMarkerData.scanned.sentence}
        bind:checked={previewMode}
      />
    </div>
    <div class="fields">
      {#await loadedFields}
        <div>Getting fields in note type...</div>
      {:then fieldNames}
        {#each fieldNames as field}
          <div class="field-name">{field}</div>
          {#if previewMode}
            <input class="field-marker" disabled value={markerValue(field)} />
          {:else}
            <select class="field-marker" bind:value={fieldTemplates[field]}>
              {#each AnkiNoteBuilder.MARKERS as marker}
                <option>{marker}</option>
              {/each}
            </select>
          {/if}
        {/each}
      {:catch err}
        <div class="error">{err.toString()}</div>
      {/await}
    </div>
    <div class="tags-container">
      <div class="tags-label">Tags</div>
      <div class="tags-value">
        <input type="text" title="separated by space" bind:value={ankiTags} />
      </div>
    </div>
  {:catch err}
    <div class="error">{err.toString()}</div>
  {/await}
</Modal>

<style>
  input {
    width: 100%;
  }
  .selects {
    display: grid;
    grid-template-columns: 1fr 1fr;
    row-gap: 12px;
    column-gap: 16px;
    align-items: center;
    margin-bottom: 18px;
  }
  .item-title {
    grid-column: 1 / 2;
    font-weight: bold;
  }
  .item-select {
    grid-column: 2 / 3;
    font-size: 1em;
  }
  .item-select.invalid {
    color: red;
  }

  .preview-toggle {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: 6px;
    margin: 6px;
  }
  .preview-toggle input {
    flex: 0 0 auto;
    width: initial;
  }

  .fields {
    display: grid;
    grid-template-columns: auto 1fr;
    row-gap: 8px;
    column-gap: 12px;
    align-items: center;
  }
  .field-name {
    grid-column: 1 / 2;
    font-size: 1em;
  }
  .field-marker {
    grid-column: 2 / 3;
    width: 100%;
    height: 1.6em;
    font-size: 1em;
    padding: 0px 2px;
  }

  .tags-container {
    display: flex;
    gap: 12px;
    align-items: center;
    margin-top: 20px;
  }
  .tags-label {
    flex: 0 0 auto;
    font-weight: bold;
  }
  .tags-value {
    flex: 1 1 auto;
  }
  .error {
    color: red;
  }
</style>
