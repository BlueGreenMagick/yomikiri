<!--
  @component
  passed-in noteData object is modified live when user changes field value
-->
<script lang="ts">
  import type { Field, NoteData } from "~/ankiNoteBuilder";
  import NotePreview from "../components/NotePreview.svelte";
  import NotePreviewField from "~/components/NotePreviewField.svelte";
  import { createEventDispatcher } from "svelte";
  import TextButton from "~/components/TextButton.svelte";

  interface FieldWatch extends Field {
    _value: string;
  }

  interface Events {
    back: void;
    addNote: NoteData;
  }

  export let noteData: NoteData;

  const dispatch = createEventDispatcher<Events>();

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

  function onBack() {
    dispatch("back");
  }

  function onAdd() {
    dispatch("addNote");
  }
</script>

<div class="add-to-anki">
  <div class="title-bar">
    <div class="title-left"><TextButton label="Back" on:click={onBack} /></div>
    <div class="title-center">Add to Anki</div>
    <div class="title-right"><TextButton label="Add" on:click={onAdd} /></div>
  </div>
  <div class="scrollable">
    <div class="preview-container">
      <NotePreview fields={noteData.fields} />
    </div>
    <div class="tags">
      <NotePreviewField field={tagField} bold />
    </div>
  </div>
</div>

<style>
  .add-to-anki {
    height: 100vh;
    display: flex;
    flex-direction: column;
    overflow-y: hidden;
    background-color: var(--background-alt);
  }

  .title-bar {
    flex: 0 0 auto;
    height: 2.4em;
    border-bottom: 1px solid var(--border);
    display: flex;
    align-items: center;
    padding: 0 0.6em;
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
