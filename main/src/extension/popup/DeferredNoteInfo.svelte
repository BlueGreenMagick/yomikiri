<script lang="ts">
  import IconedButton from "components/IconedButton.svelte";
  import type Config from "lib/config";
  import IconRefreshOutline from "@icons/refresh-outline.svg";
  import IconTrash from "@icons/trash.svg";
  import type { AnkiApi, DesktopAnkiApi } from "@platform/anki";
  import { Toast } from "lib/toast";
  import TrashToastIcon from "components/toast/TrashToastIcon.svelte";
  import CancelDeferredNoteDeletion from "components/toast/CancelDeferredNoteDeletion.svelte";

  export let config: Config;
  export let ankiApi: AnkiApi;

  let addingNotes = false;

  const confDeferredNoteCount = config.store("state.anki.deferred_note_count");
  const confDeferredNoteError = config.store("state.anki.deferred_note_error");

  let errorMessage = "Loading error message...";

  async function getErrorMessages() {
    const errors = await (
      ankiApi as DesktopAnkiApi
    ).getDeferredNotesErrorMessages();
    errorMessage = errors[0];
  }

  async function addDeferredNotes() {
    if (addingNotes) {
      return;
    }

    try {
      addingNotes = true;
      await (ankiApi as DesktopAnkiApi).addDeferredNotes();
    } finally {
      addingNotes = false;
    }
  }

  async function discardDeferredNotes() {
    const clearJob = await (ankiApi as DesktopAnkiApi).clearDeferredNotes();

    let weakToast: WeakRef<Toast>;
    const toast = new Toast("success", CancelDeferredNoteDeletion,{
      duration: 4000,
      icon: TrashToastIcon,
      props: {
        count: clearJob.notes.length,
        onCancel: async () => {
          await clearJob.undo();
          weakToast.deref()?.dismiss();
        },
      },
    })
    weakToast = new WeakRef(toast);
  }

  $: if ($confDeferredNoteError) void getErrorMessages();
</script>

<div
  class="deferred-note-info"
  class:hidden={$confDeferredNoteCount === 0}
  class:error={$confDeferredNoteError}
>
  <div class="text">
    <div class="text-info">
      <b>{$confDeferredNoteCount} Anki notes</b> are waiting to be added.
    </div>
    {#if $confDeferredNoteError}
      <div class="text-error">
        <b>Error:</b>
        {errorMessage}
      </div>
    {/if}
  </div>
  <div class="icons">
    <IconedButton
      disabled={addingNotes}
      on:click={() => {
        void addDeferredNotes();
      }}
    >
      <IconRefreshOutline />
    </IconedButton>
    <IconedButton
      color="#f55151"
      colorHover="var(--text-warn)"
      disabled={addingNotes}
      on:click={() => {
        void discardDeferredNotes();
      }}
    >
      <IconTrash />
    </IconedButton>
  </div>
</div>

<style>
  .deferred-note-info {
    display: flex;
    margin: 8px;
    padding: 8px;
    border-radius: 6px;
    background-color: var(--background-alt);
    align-items: center;
  }

  .deferred-note-info.hidden {
    display: none;
  }

  .deferred-note-info.error {
    background-color: #ffe4e4;
  }

  .text {
    flex: 1 1 0;
    align-items: center;
  }

  .text-error {
    color: red;
    font-size: 0.875rem;
    margin-top: 0.3rem;
  }

  .icons {
    flex: 0 0 auto;
    display: flex;
  }
</style>
