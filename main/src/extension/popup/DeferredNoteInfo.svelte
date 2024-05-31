<script lang="ts">
  import IconedButton from "components/IconedButton.svelte";
  import type Config from "lib/config";
  import IconRefreshOutline from "@icons/refresh-outline.svg";
  import IconTrash from "@icons/trash.svg";
  import type { ExtensionPlatform } from "@platform";
  import type { AnkiApi, DesktopAnkiApi } from "@platform/anki";
  import { Toast } from "lib/toast";
  import TrashToastIcon from "components/toast/TrashToastIcon.svelte";
  import type { AnkiNote } from "lib/anki";
  import CancelDeferredNoteDeletion from "./CancelDeferredNoteDeletion.svelte";

  export let config: Config;
  export let platform: ExtensionPlatform;
  export let ankiApi: AnkiApi;

  let addingNotes = false;

  const browserApi = platform.browserApi;
  const confDeferredNoteCount = config.store("state.anki.deferred_note_count");
  const confDeferredNoteError = config.store("state.anki.deferred_note_error");

  let errorMessage = "Loading error message...";

  async function getErrorMessages() {
    const errors = await browserApi.getStorage<string[]>(
      "deferred-anki-note-errors",
    );
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
    const notes = await browserApi.getStorage<AnkiNote[]>(
      "deferred-anki-note",
      [],
    );
    const errors = await browserApi.getStorage<string[]>(
      "deferred-anki-note-errors",
      [],
    );
    await config.set("state.anki.deferred_note_count", 0);
    await config.set("state.anki.deferred_note_error", false);
    await browserApi.removeStorage("deferred-anki-note");
    await browserApi.removeStorage("deferred-anki-note-errors");

    let weakToast: WeakRef<Toast>;
    const toast = Toast.success(CancelDeferredNoteDeletion, {
      duration: 4000,
      icon: TrashToastIcon,
      props: {
        count: notes.length,
        onCancel: async () => {
          await browserApi.setStorage("deferred-anki-note", notes);
          if (errors.length > 0) {
            await browserApi.setStorage("deferred-anki-note-errors", errors);
          }
          await config.set("state.anki.deferred_note_count", notes.length);
          await config.set("state.anki.deferred_note_error", errors.length > 0);
          weakToast.deref()?.dismiss();
        },
      },
    });
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
      on:click={() => {
        void addDeferredNotes();
      }}
    >
      <IconRefreshOutline />
    </IconedButton>
    <IconedButton
      color="#f55151"
      colorHover="var(--text-warn)"
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
