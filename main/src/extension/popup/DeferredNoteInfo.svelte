<script lang="ts">
  import IconedButton from "components/IconedButton.svelte";
  import type Config from "lib/config";
  import IconRefreshOutline from "@icons/refresh-outline.svg";
  import IconTrash from "@icons/trash.svg";
  import type { ExtensionPlatform } from "@platform";

  export let config: Config;
  export let platform: ExtensionPlatform;

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

  $: if (confDeferredNoteError) void getErrorMessages();
</script>

<div class="deferred-note-info">
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
    <IconedButton>
      <IconRefreshOutline />
    </IconedButton>
    <IconedButton color="#f55151" colorHover="var(--text-warn)">
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

  .text {
    flex: 1 1 0;
  }

  .icons {
    flex: 0 0 auto;
    display: flex;
  }
</style>
