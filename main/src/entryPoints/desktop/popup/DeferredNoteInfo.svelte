<script lang="ts">
  import IconedButton from "@/features/components/IconedButton.svelte";
  import IconRefreshOutline from "#icons/refresh-outline.svg";
  import IconTrash from "#icons/trash.svg";
  import { TrashToastIcon, CancelDeferredNoteDeletion } from "@/features/toast";
  import type { AppCtx, DesktopCtx } from "@/features/ctx";

  export let ctx: AppCtx<DesktopCtx>;

  const AnkiApi = ctx.anki;
  const confDeferredNoteCount = ctx.config.store(
    "state.anki.deferred_note_count",
  );
  const confDeferredNoteError = ctx.config.store(
    "state.anki.deferred_note_error",
  );

  let addingNotes = false;
  let errorMessage = "Loading error message...";

  async function getErrorMessages() {
    const errors = await AnkiApi.getDeferredNotesErrorMessages();
    errorMessage = errors[0];
  }

  async function addDeferredNotes() {
    if (addingNotes) {
      return;
    }

    try {
      addingNotes = true;
      await AnkiApi.addDeferredNotes();
    } finally {
      addingNotes = false;
    }
  }

  async function discardDeferredNotes() {
    const clearJob = await AnkiApi.clearDeferredNotes();

    const toast = ctx.toast.custom("success", CancelDeferredNoteDeletion, {
      duration: 4000,
      icon: TrashToastIcon,
      props: {
        count: clearJob.notes.length,
        onCancel: async () => {
          await clearJob.undo();
          toast.dismiss();
        },
      },
    });
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
