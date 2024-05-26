<script lang="ts">
  import { Platform } from "@platform";
  import { type AnkiOptionsApi } from "@platform/anki";
  import GroupedOptions from "../GroupedOptions.svelte";
  import OptionClick from "../items/OptionClick.svelte";
  import OptionNumber from "../items/OptionNumber.svelte";
  import ModalAnkiTemplate from "../ankiTemplate/ModalAnkiTemplate.svelte";
  import OptionToggle from "../items/OptionToggle.svelte";
  import Utils, { SingleQueued } from "lib/utils";
  import type Config from "lib/config";

  const ANKIMOBILE_URL =
    "https://itunes.apple.com/us/app/ankimobile-flashcards/id373493387";

  export let platform: Platform;
  export let ankiApi: AnkiOptionsApi;
  export let config: Config;

  const ankiConnectPortConfig = config.store("anki.connect_port");
  const ankiEnabledConfig = config.store("anki.enabled");
  const ankiIosAutoRedirectConfig = config.store("anki.ios_auto_redirect");

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
      await ankiApi.requestAnkiInfo();
      ankiTemplateModalHidden = false;
    } catch (err) {
      let errorMsg = Utils.getErrorMessage(err);
      ankiTemplateDescriptionError = true;
      ankiTemplateDescription = errorMsg;
    }
  }

  // Checks if anki can be connected. On fail, tries again every 3 seconds.
  const checkAnkiConnection = SingleQueued(async (sAnkiEnabled) => {
    if (retryConnectTimeout !== null) {
      clearTimeout(retryConnectTimeout);
      retryConnectTimeout = null;
    }
    if (sAnkiEnabled) {
      useAnkiDescription = "loading";
      try {
        await ankiApi.checkConnection();
        useAnkiDescription = "success";
      } catch (err) {
        useAnkiError = Utils.getErrorMessage(err);
        useAnkiDescription = "error";
        retryConnectTimeout = window.setTimeout(() => {
          void checkAnkiConnection(sAnkiEnabled);
        }, 3000);
      }
    } else {
      useAnkiDescription = "off";
    }
  });

  $: void checkAnkiConnection($ankiEnabledConfig);
</script>

<GroupedOptions title="Anki">
  <OptionToggle bind:value={$ankiEnabledConfig} title="Use Anki">
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

  {#if Platform.IS_IOSAPP}
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
