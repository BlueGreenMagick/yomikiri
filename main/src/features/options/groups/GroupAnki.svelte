<script lang="ts">
  import type { AndroidCtx, AppCtx, DesktopCtx, IosAppCtx } from "@/features/ctx";
  import Utils, { SingleQueued } from "@/features/utils";
  import type { DesktopAnkiApi } from "@/platform/desktop";
  import ModalAnkiTemplate from "../ankiTemplate/ModalAnkiTemplate.svelte";
  import GroupedOptions from "../GroupedOptions.svelte";
  import OptionClick from "../items/OptionClick.svelte";
  import OptionNumber from "../items/OptionNumber.svelte";
  import OptionToggle from "../items/OptionToggle.svelte";

  export let ctx: AppCtx<DesktopCtx | IosAppCtx | AndroidCtx>;

  const ANKIMOBILE_URL = "https://itunes.apple.com/us/app/ankimobile-flashcards/id373493387";
  const AnkiApi = ctx.anki;

  const config = ctx.config;
  const ankiConnectPortConfig = config.store("anki.connect_port");
  const ankiEnabledConfig = config.store("anki.enabled");
  const ankiIosAutoRedirectConfig = config.store("anki.ios_auto_redirect");
  const ankiDeferNotesConfig = config.store("anki.defer_notes");

  let useAnkiDescription: "off" | "loading" | "success" | "error" = "off";
  let useAnkiError = "";
  let ankiTemplateDescriptionError = false;
  let ankiTemplateDescription = "";
  let ankiTemplateModalHidden = true;
  let retryConnectTimeout: number | null = null;

  async function openAnkiTemplateModal() {
    ankiTemplateDescriptionError = false;
    ankiTemplateDescription = "";
    try {
      await AnkiApi.requestAnkiInfo();
      ankiTemplateModalHidden = false;
    } catch (err) {
      let errorMsg = Utils.getErrorMessage(err);
      ankiTemplateDescriptionError = true;
      ankiTemplateDescription = errorMsg;
    }
  }

  // Checks if anki can be connected. On fail, tries again every 3 seconds.
  const checkAnkiConnection = SingleQueued(async () => {
    if (retryConnectTimeout !== null) {
      clearTimeout(retryConnectTimeout);
      retryConnectTimeout = null;
    }
    if ($ankiEnabledConfig) {
      if (useAnkiDescription === "off") {
        useAnkiDescription = "loading";
      }
      try {
        await AnkiApi.checkConnection();
        if (AnkiApi.type === "desktop") {
          void AnkiApi.addDeferredNotes();
        }
        useAnkiDescription = "success";
      } catch (err) {
        useAnkiError = Utils.getErrorMessage(err);
        useAnkiDescription = "error";
        retryConnectTimeout = window.setTimeout(() => {
          void checkAnkiConnection();
        }, 3000);
      }
    } else {
      useAnkiDescription = "off";
    }
  });

  /** Do action if there are existing deferred anki notes. */
  function onToggleAnkiDeferNotes(AnkiApi: DesktopAnkiApi): boolean {
    if (!$ankiDeferNotesConfig) {
      return true;
    }
    const deferredNoteCount = config.get("state.anki.deferred_note_count");
    if (deferredNoteCount <= 0) {
      void AnkiApi.clearDeferredNotes();
      return true;
    }
    const response = confirm(
      `This will discard ${deferredNoteCount} Anki notes that are waiting to be added. Proceed?`,
    );
    if (response) {
      void AnkiApi.clearDeferredNotes();
    }
    return response;
  }

  $: $ankiEnabledConfig, $ankiConnectPortConfig, void checkAnkiConnection();
</script>

<GroupedOptions title="Anki">
  <OptionToggle bind:value={$ankiEnabledConfig} title="Use Anki">
    {#if useAnkiDescription === "loading"}
      Connecting to Anki...
    {:else if useAnkiDescription === "success"}
      <span class="success">Successfully connected to Anki.</span>
    {:else if useAnkiDescription === "error"}
      {#if ctx.platformType === "desktop"}
        <span class="warning">{useAnkiError}</span>
        <a href="https://apps.ankiweb.net/">(Anki)</a>
        <a href="https://ankiweb.net/shared/info/2055492159">(AnkiConnect)</a>
      {:else}
        <span class="warning">
          <a href={ANKIMOBILE_URL}>AnkiMobile</a> app is not installed.
        </span>
      {/if}
    {:else if useAnkiDescription === "off"}
      {#if ctx.platformType === "desktop"}
        <a href="https://apps.ankiweb.net/">Anki</a> is a flashcard software.
      {:else}
        <a href={ANKIMOBILE_URL}>AnkiMobile</a> is a flashcard app.
      {/if}
    {/if}
  </OptionToggle>

  {#if ctx.platformType === "desktop"}
    <OptionNumber
      bind:value={$ankiConnectPortConfig}
      title="AnkiConnect port number"
    >
      This is the AnkiConnect config `webBindPort`
    </OptionNumber>
  {/if}

  <OptionClick
    title="Configure Anki template"
    buttonText="Configure"
    disabled={!$ankiEnabledConfig}
    onClick={openAnkiTemplateModal}
  >
    <span class:warning={ankiTemplateDescriptionError}>
      {ankiTemplateDescription}
    </span>
  </OptionClick>

  {#if AnkiApi.type === "desktop"}
    <OptionToggle
      bind:value={$ankiDeferNotesConfig}
      title="Add Notes Later"
      onToggle={() => onToggleAnkiDeferNotes(AnkiApi)}
    >
      If Anki is not connected, add notes later in the background when Anki is connected.
    </OptionToggle>
  {/if}

  {#if ctx.platformType === "iosapp"}
    <OptionToggle
      bind:value={$ankiIosAutoRedirectConfig}
      title="Reopen Safari after adding Anki note"
    >
      If disabled, you can manually return to Safari by clicking
      <span class="no-break">{"'\u{000025C0}\u{0000FE0E}Safari'"}</span>
      on top left corner of the screen
    </OptionToggle>
  {/if}
</GroupedOptions>
{#if !ankiTemplateModalHidden && (ctx.platformType === "desktop" || ctx.platformType === "android")}
  <ModalAnkiTemplate
    {ctx}
    onClose={() => {
      ankiTemplateModalHidden = true;
    }}
  />
{/if}

<style>
  .no-break {
    word-break: keep-all;
  }
</style>
