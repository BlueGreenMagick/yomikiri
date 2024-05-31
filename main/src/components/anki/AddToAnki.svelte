<!--
  @component
  passed-in noteData object is modified live when user changes field value
-->
<script lang="ts">
  import {
    type Field,
    type LoadingAnkiNote,
    resolveAnkiNote,
    waitForNoteToLoad,
  } from "lib/anki";
  import NoteFieldEditor from "./NoteFieldEditor.svelte";
  import TextButton from "components/TextButton.svelte";
  import { AnkiApi } from "@platform/anki";
  import { Toast } from "lib/toast";
  import { getErrorMessage, SingleQueued } from "lib/utils";
  import HourglassToastIcon from "components/toast/HourglassToastIcon.svelte";

  interface FieldWatch extends Field {
    _value: string;
  }

  export let ankiApi: AnkiApi;
  export let noteData: LoadingAnkiNote;
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
    let ankiNote = await resolveAnkiNote(noteData);
    try {
      const added = await ankiApi.addNote(ankiNote);
      if (added) {
        Toast.success("Note added to Anki");
      } else {
        Toast.success("Note will be added when Anki is connected", {
          icon: HourglassToastIcon,
          duration: 3000,
        });
        Toast.success("Note added to Anki");
      }

      noteAdded();
    } catch (err) {
      console.error(err);
      const msg = getErrorMessage(
        err,
        "An unknown error occured... Check the browser console for more info.",
      );
      Toast.error(msg);
    }
  }

  /** muatates: `allLoaded` */
  const loadNote = SingleQueued(async (_noteData: LoadingAnkiNote) => {
    allLoaded = false;
    errored = [];
    await waitForNoteToLoad(_noteData);
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
        <div class="anki-preview-field">
          <div class="field-name">{field.name}</div>
          <NoteFieldEditor {field} bind:errored={errored[i]} />
        </div>
      {/each}
    </div>
    <div class="tags">
      <div class="field-name"><em>{tagField.name}</em></div>
      <NoteFieldEditor field={tagField} />
    </div>
  </div>
</div>

<style>
  .anki-preview-field {
    width: 100%;
    margin-top: 4px;
  }

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
