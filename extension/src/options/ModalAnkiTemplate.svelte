<script lang="ts">
  import AnkiApi from "~/api/anki";
  import Modal from "./components/Modal.svelte";

  export let hidden: boolean;

  // [decks, note types]
  let loadedNames: Promise<[string[], string[]]>;
  let loadedFields: Promise<string[]>;

  let selectedNoteType: string;
  let selectedDeck: string;

  async function loadNames(): Promise<[string[], string[]]> {
    const deckNames = await AnkiApi.deckNames();
    const noteTypeNames = await AnkiApi.noteTypeNames();
    return [deckNames, noteTypeNames];
  }

  async function loadFields(notetype: string): Promise<string[]> {
    if (notetype === undefined) return [];
    await loadedNames;
    return await AnkiApi.nodeTypeFields(notetype);
  }

  loadedNames = loadNames();
  $: loadedFields = loadFields(selectedNoteType);
</script>

<Modal title="Anki Template" {hidden} on:close>
  {#await loadedNames}
    <div>Connecting to Anki...</div>
  {:then [deckNames, noteTypeNames]}
    <div class="selects">
      <div class="item-title">Deck</div>
      <select class="item-select" bind:value={selectedDeck}>
        {#each deckNames as name}
          <option value={name}>{name}</option>
        {/each}
      </select>
      <div class="item-title">Note Type</div>
      <select class="item-select" bind:value={selectedNoteType}>
        {#each noteTypeNames as name}
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
          <input type="text" />
        {/each}
      {:catch err}
        <div class="error">{err.toString()}</div>
      {/await}
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
  .error {
    color: red;
  }
</style>
