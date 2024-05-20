<script lang="ts">
  import { type AnyAnkiTemplateField, type AnkiTemplate } from "lib/anki";
  import type { Config } from "lib/config";
  import { exampleMarkerData } from "../../exampleMarkerData";
  import type { AnkiInfo } from "platform/common/anki";
  import type { Platform } from "@platform";
  import AnkiTemplateField from "./AnkiTemplateField.svelte";
  import { fieldTemplateToAnyFieldTemplate } from "lib/compat";

  export let platform: Platform;
  export let config: Config;
  export let ankiInfo: AnkiInfo;

  const template = config.get("anki.template");

  let deckNames = ankiInfo.decks;
  let notetypeNames = ankiInfo.notetypes.map((nt) => nt.name);
  let fieldNames: string[];

  let selectedDeck: string;
  let selectedNotetype: string;
  // fieldTemplates should not reload on note type change
  // so accidentally changing note type does not clear all data
  let fieldTemplates: Record<string, AnyAnkiTemplateField>;
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
        fieldTemplates[field.name] = fieldTemplateToAnyFieldTemplate(field);
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
      return template!.fields.map((f) => f.name);
    } else {
      return notetypeInfo.fields;
    }
  }

  async function saveTemplate(
    deck: string,
    notetype: string,
    fields: Record<string, AnyAnkiTemplateField>,
    tags: string
  ) {
    const template: AnkiTemplate = {
      deck,
      notetype,
      fields: [],
      tags,
    };
    for (const fieldName of fieldNames) {
      template.fields.push(fields[fieldName]);
    }
    // config.set("anki.template", template);
    await Promise.resolve(null);
  }

  loadSelected();

  $: invalidDeck = !deckNames.includes(selectedDeck);
  $: invalidNotetype = !notetypeNames.includes(selectedNotetype);
  $: fieldNames = loadFieldNames(selectedNotetype);
  $: void saveTemplate(
    selectedDeck,
    selectedNotetype,
    fieldTemplates,
    ankiTags
  );
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
    {#each fieldNames as fieldName}
      <AnkiTemplateField fieldTemplate={fieldTemplates[fieldName]} />
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
    font-size: 1em;
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
