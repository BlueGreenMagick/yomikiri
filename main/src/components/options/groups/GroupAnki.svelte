<script lang="ts">
  import { Platform } from "@platform";
  import { AnkiApi } from "@platform/anki";
  import GroupedOptions from "../GroupedOptions.svelte";
  import OptionClick from "../items/OptionClick.svelte";
  import OptionNumber from "../items/OptionNumber.svelte";
  import ModalAnkiTemplate from "../modals/ModalAnkiTemplate.svelte";
  import OptionToggle from "../items/OptionToggle.svelte";
  import Utils from "~/utils";

  let ankiTemplateDescription = "";
  let ankiEnabled: boolean;
  let ankiDisabled: boolean;
  let useAnkiDescription: "off" | "loading" | "success" | "error" = "off";
  let useAnkiError: string = "";
  let ankiTemplateModalHidden: boolean = true;
  let requesting: boolean = false;

  async function openAnkiTemplateModal() {
    ankiTemplateDescription = "";
    try {
      await AnkiApi.requestAnkiInfo();
      ankiTemplateModalHidden = false;
    } catch (err) {
      let errorMsg = Utils.errorMessage(err);
      ankiTemplateDescription = `<span class="warning">${errorMsg}</span>`;
    }
  }

  // Checks if anki can be connected. On fail, tries again every 3 seconds.
  async function checkAnkiConnection() {
    if (requesting) return;
    requesting = true;
    try {
      await AnkiApi.checkConnection();
      useAnkiDescription = "success";
    } catch (err) {
      useAnkiError = Utils.errorMessage(err);
      useAnkiDescription = "error";

      setTimeout(() => {
        if (ankiEnabled) {
          checkAnkiConnection();
        }
      }, 3000);
    }
    requesting = false;
  }

  async function onAnkiEnableChange(enabled: boolean) {
    if (enabled) {
      useAnkiDescription = "loading";
      checkAnkiConnection();
    } else {
      useAnkiDescription = "off";
    }
  }

  $: ankiDisabled = !ankiEnabled;
  $: onAnkiEnableChange(ankiEnabled);
</script>

<GroupedOptions title="Anki">
  <OptionToggle key="anki.enabled" title="Use Anki" bind:value={ankiEnabled}>
    {#if useAnkiDescription === "loading"}
      Connecting to Anki...
    {:else if useAnkiDescription === "success"}
      <span class="success">Successfully connected to Anki.</span>
    {:else if useAnkiDescription === "error"}
      <span class="warning">{useAnkiError}</span>
      {#if Platform.IS_DESKTOP}
        <a href="https://apps.ankiweb.net/">(Anki)</a>
        <a href="https://ankiweb.net/shared/info/2055492159">(AnkiConnect)</a>
      {/if}
    {:else if useAnkiDescription === "off"}
      {#if Platform.IS_DESKTOP}
        <a href="https://apps.ankiweb.net/">Anki</a> is a flashcard software.
      {:else}
        <a
          href="https://itunes.apple.com/us/app/ankimobile-flashcards/id373493387"
          >AnkiMobile</a
        > is a flashcard app.
      {/if}
    {/if}
  </OptionToggle>
  {#if Platform.IS_DESKTOP}
    <OptionNumber key="anki.connect_port" title="AnkiConnect port number">
      This is the AnkiConnect config `webBindPort`
    </OptionNumber>
  {/if}
  <OptionClick
    title="Configure Anki template"
    buttonText="Configure"
    bind:disabled={ankiDisabled}
    on:trigger={openAnkiTemplateModal}
  >
    {ankiTemplateDescription}
  </OptionClick>
  {#if Platform.IS_IOSAPP}
    <OptionToggle
      title="Reopen Safari after adding Anki note"
      key="anki.ios_auto_redirect"
    >
      If disabled, you can manually return to Safari by clicking
      <span class="no-break">{"'\u{000025C0}\u{0000FE0E}Safari'"}</span>
      on top left corner of the screen
    </OptionToggle>
  {/if}
</GroupedOptions>
{#if ankiTemplateModalHidden === false && Platform.IS_DESKTOP}
  <ModalAnkiTemplate
    on:close={() => {
      ankiTemplateModalHidden = true;
    }}
  />
{/if}

<style>
  .no-break {
    word-break: keep-all;
  }
</style>
