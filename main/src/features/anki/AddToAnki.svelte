<!--
  @component
  passed-in noteData object is modified live when user changes field value
-->
<script lang="ts">
  import TextButton from "@/features/components/TextButton.svelte";
  import { YomikiriError } from "@/features/error";
  import { HourglassToastIcon } from "@/features/toast";
  import { ChangeTracker, SingleQueued } from "@/features/utils";
  import type { AppCtx } from "../ctx";
  import {
    type Field,
    type LoadingAnkiNote,
    resolveAnkiNote,
    waitForNoteToLoad,
  } from "./ankiBuilder";
  import NoteFieldEditor from "./NoteFieldEditor.svelte";

  interface FieldWatch extends Field {
    _value: string;
  }

  export let ctx: AppCtx;
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
  let noteDataChanged: number;
  let noteDataChangeTracker = new ChangeTracker<typeof noteData>();

  async function onAdd() {
    let ankiNote = await resolveAnkiNote(noteData);
    let added: boolean;
    try {
      added = await ctx.anki.addNote({ note: ankiNote });
      if (added) {
        ctx.toast.success("Note added to Anki");
      } else {
        ctx.toast.success("Note will be added when Anki is connected", "", {
          icon: HourglassToastIcon,
          duration: 3000,
        });
      }
      noteAdded();
    } catch (err) {
      ctx.toast.yomikiriError(YomikiriError.from(err));
    }
  }

  /** muatates: `allLoaded` */
  const loadNote = SingleQueued(async () => {
    allLoaded = false;
    errored = [];
    await waitForNoteToLoad(noteData);
    allLoaded = true;
  });

  $: noteDataChanged = noteDataChangeTracker.track(noteData);
  $: noteDataChanged, void loadNote();
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
      {#each noteData.fields as field, i (field)}
        <div class="anki-preview-field">
          <div class="field-name">{field.name}</div>
          <NoteFieldEditor {field} bind:errored={errored[i]} />
        </div>
      {/each}
    </div>
    <div class="tags">
      <div class="field-name"><b>{tagField.name}</b></div>
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
    min-width: 0;

    display: flex;
    flex-direction: column;
    overflow-y: hidden;
    background-color: var(--background-alt);
    min-height: 100%;
    max-height: inherit;
  }

  .title-bar {
    flex: 0 0 auto;
    height: 2.4em;
    padding: 0 0.6em;
    font-size: 1.125rem;
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
    min-width: 0;
    text-align: center;
  }
  .title-right {
    flex: 1 0 0;
    min-width: fit-content;
    text-align: end;
  }

  .scrollable {
    flex: 1 1 auto;
    min-width: 0;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    padding: 4px 8px;
  }

  .fields-container {
    flex: 1 0 auto;
    min-width: 0;
  }

  .tags {
    flex: 0 0 auto;
    margin-top: 1rem;
    margin-bottom: 0.25rem;
  }
</style>
