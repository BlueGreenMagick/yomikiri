<!--
  @component
  passed-in noteData object is modified live when user changes field value
-->
<script lang="ts">
  import { type Field, LoadingNoteData } from "~/ankiNoteBuilder";
  import NotePreviewField from "./NotePreviewField.svelte";
  import TextButton from "~/components/TextButton.svelte";
  import { AnkiApi } from "@platform/anki";
  import { Toast } from "~/toast";
  import { getErrorMessage, SingleQueued } from "~/utils";

  interface FieldWatch extends Field {
    _value: string;
  }

  export let ankiApi: AnkiApi;
  export let noteData: LoadingNoteData;
  export let noteAdded: () => void;
  export let onBack: () => void;

  let tagField: FieldWatch = {
    name: "Tags",
    _value: noteData.tags,

    get value() {
      return this._value;
    },
    set value(val: string) {
      noteData.tags = val;
      this._value = val;
    },
  };
  let errored: boolean[] = [];
  let anyErrored = false;
  let allLoaded = false;

  async function onAdd() {
    let resolvedNoteData = await LoadingNoteData.resolve(noteData);
    try {
      await ankiApi.addNote(resolvedNoteData);

      Toast.success("Note added to Anki");
      noteAdded();
    } catch (err) {
      console.error(err);
      const msg = getErrorMessage(
        err,
        "An unknown error occured... Check the browser console for more info."
      );
      Toast.error(msg);
    }
  }

  /** muatates: `allLoaded` */
  const loadNote = SingleQueued(async (_noteData: LoadingNoteData) => {
    allLoaded = false;
    errored = [];
    await LoadingNoteData.loadComplete(_noteData);
    allLoaded = true;
  });

  $: void loadNote(noteData);
  $: anyErrored = errored.includes(true);
</script>

<div class="add-to-anki">
  <div class="title-bar">
    <div class="title-left"><TextButton label="Back" onClick={onBack} /></div>
    <div class="title-center">Add to Anki</div>
    <div class="title-right">
      <TextButton
        label="Add"
        onClick={onAdd}
        disabled={!allLoaded || anyErrored}
        style={anyErrored ? "warn" : "default"}
      />
    </div>
  </div>
  <div class="scrollable">
    <div class="fields-container">
      {#each noteData.fields as field, i}
        <NotePreviewField {field} bind:errored={errored[i]} />
      {/each}
    </div>
    <div class="tags">
      <NotePreviewField field={tagField} bold />
    </div>
  </div>
</div>

<style>
  .add-to-anki {
    flex: 1 1 auto;

    display: flex;
    flex-direction: column;
    overflow-y: hidden;
    background-color: var(--background-alt);
    min-height: 100%;
  }

  .title-bar {
    flex: 0 0 auto;
    height: 2.4em;
    padding: 0 0.6em;
    font-size: 1.125em;
    border-bottom: 1px solid var(--border);
    display: flex;
    align-items: center;
  }
  .title-left {
    flex: 1 0 0;
    min-width: fit-content;
    text-align: start;
  }
  .title-center {
    flex: 0 1 auto;
    text-align: center;
  }
  .title-right {
    flex: 1 0 0;
    min-width: fit-content;
    text-align: end;
  }

  .scrollable {
    flex: 1 1 auto;
    overflow-y: auto;
    padding: 4px 8px;
  }

  .tags {
    margin-top: 12px;
  }
</style>
