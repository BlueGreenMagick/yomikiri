<script lang="ts">
  import type { NoteData } from "~/ankiNoteBuilder";
  import Config from "~/config";
  import { AnkiNoteBuilder } from "~/ankiNoteBuilder";
  import {
    exampleMarkerData,
    exampleTranslatedSentence,
  } from "../exampleMarkerData";
  import { updateConfig } from "../stores";
  import type { AnkiInfo } from "~/platform/common/anki";

  export let ankiInfo: AnkiInfo;

  const template = Config.get("anki.template");

  let previewMode = false;

  let deckNames = ankiInfo.decks;
  let notetypeNames = ankiInfo.notetypes.map((nt) => nt.name);
  let fieldNames: string[];

  let selectedDeck: string;
  let selectedNotetype: string;
  // fieldTemplates should not reload on note type change
  // so accidentally changing note type does not clear all data
  let fieldTemplates: { [name: string]: string };
  let ankiTags: string;

  let prevDeck: string | null;
  let prevNotetype: string | null;

  function loadSelected() {
    if (template === null) {
      selectedNotetype = notetypeNames[0];
      selectedDeck = deckNames[0];
      fieldTemplates = {};
      ankiTags = "";
      prevDeck = null;
      prevNotetype = null;
    } else {
      selectedDeck = template.deck;
      selectedNotetype = template.notetype;
      fieldTemplates = {};
      for (const field of template.fields) {
        fieldTemplates[field.name] = field.value;
      }
      ankiTags = template.tags;
      prevDeck = template.deck;
      prevNotetype = template.notetype;
    }
  }

  function loadFieldNames(notetypeName: string): string[] {
    let notetypeInfo = ankiInfo.notetypes.find(
      (nt) => nt.name === notetypeName
    );
    if (notetypeInfo === undefined) {
      return (template as NoteData).fields.map((f) => f.name);
    } else {
      return notetypeInfo.fields;
    }
  }

  async function saveTemplate(
    deck: string,
    notetype: string,
    fields: { [name: string]: string },
    tags: string
  ) {
    const template: NoteData = {
      deck,
      notetype,
      fields: [],
      tags,
    };
    for (const fieldName of fieldNames) {
      template.fields.push({
        name: fieldName,
        value: fields[fieldName] ?? "",
      });
    }
    Config.set("anki.template", template);
    updateConfig();
  }

  function markerValue(field: string) {
    let marker = fieldTemplates[field] as AnkiNoteBuilder.Marker;
    if (marker === "translated-sentence") {
      return exampleTranslatedSentence;
    } else {
      return AnkiNoteBuilder.markerValue(
        fieldTemplates[field],
        exampleMarkerData
      );
    }
  }

  loadSelected();

  $: invalidDeck = !deckNames.includes(selectedDeck);
  $: invalidNotetype = !notetypeNames.includes(selectedNotetype);
  $: fieldNames = loadFieldNames(selectedNotetype);
  $: saveTemplate(selectedDeck, selectedNotetype, fieldTemplates, ankiTags);
</script>

<div>
  <div class="selects group">
    <div class="item-title">Deck</div>
    <select
      class="item-select"
      bind:value={selectedDeck}
      class:invalid={invalidDeck}
    >
      {#each deckNames as name}
        <option value={name}>{name}</option>
      {/each}
      {#if prevDeck !== null && !deckNames.includes(prevDeck)}
        <option value={prevDeck}>(Invalid) {prevDeck}</option>
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
      {#if prevNotetype !== null && !notetypeNames.includes(prevNotetype)}
        <option value={prevNotetype}>(Invalid) {prevNotetype}</option>
      {/if}
    </select>
  </div>
  <div class="preview-toggle">
    <label for="preview-checkbox" title={exampleMarkerData.sentence}>
      Preview
    </label>
    <input
      type="checkbox"
      id="preview-checkbox"
      title={exampleMarkerData.sentence}
      bind:checked={previewMode}
    />
  </div>
  <div class="fields group">
    {#each fieldNames as field}
      <div class="field-name">{field}</div>
      {#if previewMode}
        <input class="field-marker" disabled value={markerValue(field)} />
      {:else}
        <select class="field-marker" bind:value={fieldTemplates[field]}>
          {#each AnkiNoteBuilder.markerKeys() as marker}
            <option value={marker}>{AnkiNoteBuilder.MARKERS[marker]}</option>
          {/each}
        </select>
      {/if}
    {/each}
  </div>
  <div class="tags-container group">
    <div class="tags-label">Tags</div>
    <div class="tags-value">
      <input type="text" title="separated by space" bind:value={ankiTags} />
    </div>
  </div>
</div>

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
  .group {
    padding: 8px 12px;
    border-radius: 8px;
    background-color: white;
  }
</style>
