<script lang="ts">
  import AnkiApi from "@platform/anki";
  import type { NoteData } from "~/ankiNoteBuilder";
  import Config from "~/config";
  import Modal from "./components/Modal.svelte";
  import Utils from "~/utils";

  export let hidden: boolean;

  const [initializePromise, initializeResolve] = Utils.createPromise<void>();
  let initialized = false;

  let deckNames: string[];
  let notetypeNames: string[];
  let loadedFields: Promise<string[]>;

  let selectedDeck: string;
  let selectedNotetype: string;
  // fieldTemplates should not reload on note type change
  // so accidentally changing note type does not clear all data
  let fieldTemplates: { [name: string]: string };
  let ankiTags: string;

  /** load deckNames and notetypeNames */
  async function loadNames() {
    deckNames = await AnkiApi.deckNames();
    notetypeNames = await AnkiApi.notetypeNames();
    const templates = await Config.get("anki.templates");
    if (templates.length === 0) {
      selectedNotetype = notetypeNames[0];
      selectedDeck = deckNames[0];
      fieldTemplates = {};
      ankiTags = "";
    } else {
      const template = templates[0];
      if (deckNames.includes(template.deck)) {
        selectedDeck = template.deck;
      } else {
        selectedDeck = deckNames[0];
      }
      if (notetypeNames.includes(template.notetype)) {
        selectedNotetype = template.notetype;
      } else {
        selectedNotetype = notetypeNames[0];
      }
      fieldTemplates = {};
      for (const field of template.fields) {
        fieldTemplates[field.name] = field.value;
      }
      ankiTags = template.tags;
    }
  }

  async function loadFields(notetype: string) {
    if (notetype === undefined) return [];
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
    Config.set("anki.templates", [template]);
  }

  async function initialize(hidden: boolean) {
    if (hidden) return;
    await loadNames();
    loadedFields = loadFields(selectedNotetype);
    initializeResolve();
    initialized = true;
  }

  $: loadedFields = loadFields(selectedNotetype);
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
      <select class="item-select" bind:value={selectedDeck}>
        {#each deckNames as name}
          <option value={name}>{name}</option>
        {/each}
      </select>
      <div class="item-title">Note Type</div>
      <select class="item-select" bind:value={selectedNotetype}>
        {#each notetypeNames as name}
          <option value={name}>{name}</option>
        {/each}
      </select>
    </div>
    <div class="fields">
      {#await loadedFields}
        <div>Getting fields in note type...</div>
      {:then fieldNames}
        {#each fieldNames as field}
          <div class="field-name">{field}</div>
          <input type="text" bind:value={fieldTemplates[field]} />
        {/each}
      {:catch err}
        <div class="error">{err.toString()}</div>
      {/await}
    </div>
    <div class="tags-container">
      <div class="tags-label"><b>Tags</b></div>
      <div class="tags-value">
        <input type="text" title="separated by space" bind:value={ankiTags} />
      </div>
    </div>
  {:catch err}
    <div class="error">{err.toString()}</div>
  {/await}
</Modal>

<style>
  .selects {
    display: grid;
    grid-template-columns: 1fr 1fr;
    row-gap: 12px;
    column-gap: 16px;
    align-items: center;
  }
  .item-title {
    grid-column: 1 / 2;
  }
  .item-select {
    grid-column: 2 / 3;
    font-size: 1em;
  }
  .fields {
    display: grid;
    grid-template-columns: auto 1fr;
    row-gap: 8px;
    column-gap: 12px;
    align-items: center;
    margin-top: 24px;
  }
  .field-name {
    grid-column: 1 / 2;
    font-size: 1em;
  }
  input {
    grid-column: 2 / 3;
    width: 100%;
    box-sizing: border-box;
    font-size: 1em;
    padding: 1px 2px;
  }
  .tags-container {
    display: flex;
    gap: 12px;
    align-items: center;
    margin-top: 20px;
  }
  .tags-label {
    flex: 0 0 auto;
  }
  .tags-value {
    flex: 1 1 auto;
  }
  .error {
    color: red;
  }
</style>
