<script lang="ts">
  import {
    newAnkiTemplateField,
    type AnkiTemplate,
    type AnkiTemplateField,
  } from "lib/anki";
  import type { Config } from "lib/config";
  import type { AnkiInfo } from "platform/common/anki";
  import type { Platform } from "@platform";
  import AnkiTemplateFieldEdit from "./AnkiTemplateFieldEdit.svelte";

  export let platform: Platform;
  export let config: Config;
  export let ankiInfo: AnkiInfo;

  let deckNames: string[];
  let notetypeNames: string[];
  let fieldNames: string[];

  let selectedDeck: string;
  let selectedNotetype: string;
  // fieldTemplates should not reload on note type change
  // so accidentally changing note type does not clear all data
  let fieldTemplates: Record<string, AnkiTemplateField> = {};
  let ankiTags: string;

  let prevTemplate: AnkiTemplate | null = null;
  let prevDeck: string | null = null;
  let prevNotetype: string | null = null;

  function initialize() {
    deckNames = ankiInfo.decks;
    notetypeNames = ankiInfo.notetypes.map((nt) => nt.name);
    let template = config.get("anki.anki_template");
    if (template === null) {
      selectedDeck = deckNames[0];
      selectedNotetype = notetypeNames[0];
      ankiTags = "";
    } else {
      prevTemplate = template;
      prevDeck = template.deck;
      prevNotetype = template.notetype;

      selectedDeck = template.deck;
      selectedNotetype = template.notetype;
      ankiTags = template.tags;
      for (const field of template.fields) {
        fieldTemplates[field.name] = field;
      }
    }
  }

  /** (`selectedNotetype`) -> `fieldNames`, `fieldTemplates` */
  function loadFields(_: unknown) {
    let notetypeInfo = ankiInfo.notetypes.find(
      (nt) => nt.name === selectedNotetype,
    );
    if (notetypeInfo === undefined) {
      fieldNames = prevTemplate?.fields.map((f) => f.name) ?? [];
    } else {
      fieldNames = notetypeInfo.fields;
    }
    for (const fieldName of fieldNames) {
      if (fieldTemplates[fieldName] === undefined) {
        fieldTemplates[fieldName] = newAnkiTemplateField(fieldName, "");
      }
    }
  }

  async function saveTemplate() {
    const template: AnkiTemplate = {
      deck: selectedDeck,
      notetype: selectedNotetype,
      fields: [],
      tags: ankiTags,
    };
    for (const fieldName of fieldNames) {
      const field = fieldTemplates[fieldName];
      template.fields.push(field);
    }
    await config.set("anki.anki_template", template);
  }

  $: ankiInfo, initialize();
  $: loadFields(selectedNotetype);
  $: selectedDeck,
    selectedNotetype,
    fieldTemplates,
    ankiTags,
    void saveTemplate();

  $: invalidDeck = !deckNames.includes(selectedDeck);
  $: invalidNotetype = !notetypeNames.includes(selectedNotetype);
</script>

<div class="anki-template-modal">
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
  <div class="fields group">
    {#each fieldNames as fieldName (fieldName)}
      <AnkiTemplateFieldEdit
        {platform}
        {config}
        bind:fieldTemplate={fieldTemplates[fieldName]}
      />
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
  .anki-template-modal {
    height: 100%;
    overflow-y: scroll;
    display: flex;
    flex-direction: column;
  }

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
    font-size: 1rem;
  }
  .item-select.invalid {
    color: red;
  }

  .fields {
    flex: 1 0 auto;
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
  }
</style>
