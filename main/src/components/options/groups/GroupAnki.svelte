<script lang="ts">
  import { Platform } from "@platform";
  import { type AnkiOptionsApi } from "@platform/anki";
  import GroupedOptions from "../GroupedOptions.svelte";
  import OptionClick from "../items/OptionClick.svelte";
  import OptionNumber from "../items/OptionNumber.svelte";
  import ModalAnkiTemplate from "../modals/ModalAnkiTemplate.svelte";
  import OptionToggle from "../items/OptionToggle.svelte";
  import Utils from "~/utils";
  import type Config from "~/config";

  const ANKIMOBILE_URL =
    "https://itunes.apple.com/us/app/ankimobile-flashcards/id373493387";

  export let platform: Platform;
  export let ankiApi: AnkiOptionsApi;
  export let config: Config;

  let ankiEnabled: boolean;
  let ankiDisabled: boolean;
  let useAnkiDescription: "off" | "loading" | "success" | "error" = "off";
  let useAnkiError = "";
  let ankiTemplateDescriptionError = false;
  let ankiTemplateDescription = "";
  let ankiTemplateModalHidden = true;
  let requesting = false;

  async function openAnkiTemplateModal() {
    ankiTemplateDescriptionError = false;
    ankiTemplateDescription = "";
    try {
      await ankiApi.requestAnkiInfo();
      ankiTemplateModalHidden = false;
    } catch (err) {
      let errorMsg = Utils.errorMessage(err);
      ankiTemplateDescriptionError = true;
      ankiTemplateDescription = errorMsg;
    }
  }

  // Checks if anki can be connected. On fail, tries again every 3 seconds.
  async function checkAnkiConnection() {
    if (requesting) return;
    requesting = true;
    try {
      await ankiApi.checkConnection();
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
      await checkAnkiConnection();
    } else {
      useAnkiDescription = "off";
    }
  }

  $: ankiDisabled = !ankiEnabled;
  $: onAnkiEnableChange(ankiEnabled);
</script>

<GroupedOptions title="Anki">
  <OptionToggle
    {config}
    key="anki.enabled"
    title="Use Anki"
    bind:value={ankiEnabled}
  >
    {#if useAnkiDescription === "loading"}
      Connecting to Anki...
    {:else if useAnkiDescription === "success"}
      <span class="success">Successfully connected to Anki.</span>
    {:else if useAnkiDescription === "error"}
      {#if Platform.IS_DESKTOP}
        <span class="warning">{useAnkiError}</span>
        <a href="https://apps.ankiweb.net/">(Anki)</a>
        <a href="https://ankiweb.net/shared/info/2055492159">(AnkiConnect)</a>
      {:else}
        <span class="warning">
          <a href={ANKIMOBILE_URL}>AnkiMobile</a> app is not installed.
        </span>
      {/if}
    {:else if useAnkiDescription === "off"}
      {#if Platform.IS_DESKTOP}
        <a href="https://apps.ankiweb.net/">Anki</a> is a flashcard software.
      {:else}
        <a href={ANKIMOBILE_URL}>AnkiMobile</a> is a flashcard app.
      {/if}
    {/if}
  </OptionToggle>

  {#if Platform.IS_DESKTOP}
    <OptionNumber
      {config}
      key="anki.connect_port"
      title="AnkiConnect port number"
    >
      This is the AnkiConnect config `webBindPort`
    </OptionNumber>
  {/if}

  <OptionClick
    title="Configure Anki template"
    buttonText="Configure"
    bind:disabled={ankiDisabled}
    on:trigger={openAnkiTemplateModal}
  >
    <span class:warning={ankiTemplateDescriptionError}>
      {ankiTemplateDescription}
    </span>
  </OptionClick>

  {#if Platform.IS_IOSAPP}
    <OptionToggle
      {config}
      title="Reopen Safari after adding Anki note"
      key="anki.ios_auto_redirect"
    >
      If disabled, you can manually return to Safari by clicking
      <span class="no-break">{"'\u{000025C0}\u{0000FE0E}Safari'"}</span>
      on top left corner of the screen
    </OptionToggle>
  {/if}
</GroupedOptions>
{#if !ankiTemplateModalHidden && Platform.IS_DESKTOP}
  <ModalAnkiTemplate
    {platform}
    {config}
    {ankiApi}
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
