<script lang="ts">
  import { Platform } from "@platform";
  import { AnkiApi } from "@platform/anki";
  import GroupedOptions from "./components/GroupedOptions.svelte";
  import OptionClick from "./components/OptionClick.svelte";
  import OptionNumber from "./components/OptionNumber.svelte";
  import ModalAnkiTemplate from "./ModalAnkiTemplate.svelte";
  import OptionToggle from "./components/OptionToggle.svelte";

  let ankiTemplateDescription = "";
  let ankiEnabled: boolean;
  let ankiDisabled: boolean;
  let useAnkiDescription = "";
  let ankiTemplateModalHidden: boolean = true;

  async function openAnkiTemplateModal() {
    ankiTemplateDescription = "";
    try {
      await AnkiApi.requestAnkiInfo();
      ankiTemplateModalHidden = false;
    } catch (err) {
      let errorMsg;
      if (err instanceof Error) {
        errorMsg = err.message;
      } else {
        errorMsg = "Unknown error: check the browser console for details";
      }
      ankiTemplateDescription = `<span class="warning">${errorMsg}</span>`;
    }
  }

  async function checkAnkiConnection() {
    useAnkiDescription = "Connecting to Anki...";
    try {
      await AnkiApi.checkConnection();
      useAnkiDescription =
        "<span class='success'>Successfully connected to Anki.</span>";
    } catch (err) {
      let errorMsg;
      if (err instanceof Error) {
        errorMsg = err.message;
      } else {
        errorMsg = "Unknown error: check the browser console for details";
        console.error(err);
      }
      useAnkiDescription = `<span class="warning">${errorMsg}</span>`;
    }
  }

  async function onAnkiEnableChange(enabled: boolean) {
    if (enabled) {
      checkAnkiConnection();
    } else {
      if (Platform.IS_DESKTOP) {
        useAnkiDescription =
          "<a href='https://apps.ankiweb.net/'>Anki</a> is a flashcard software.";
      } else {
        useAnkiDescription =
          "<a href='https://itunes.apple.com/us/app/ankimobile-flashcards/id373493387'>AnkiMobile</a> is a flashcard app.";
      }
    }
  }

  $: ankiDisabled = !ankiEnabled;
  $: onAnkiEnableChange(ankiEnabled);
</script>

<GroupedOptions title="Anki">
  <OptionToggle
    key="anki.enabled"
    title="Use Anki"
    description={useAnkiDescription}
    bind:value={ankiEnabled}
  />
  {#if Platform.IS_DESKTOP}
    <OptionNumber
      key="anki.connect_port"
      title="AnkiConnect port number"
      description="This is the AnkiConnect config `webBindPort`"
    />
  {/if}
  <OptionClick
    title="Configure Anki template"
    buttonText="Configure"
    description={ankiTemplateDescription}
    bind:disabled={ankiDisabled}
    on:trigger={openAnkiTemplateModal}
  />
</GroupedOptions>
{#if ankiTemplateModalHidden === false && Platform.IS_DESKTOP}
  <ModalAnkiTemplate
    on:close={() => {
      ankiTemplateModalHidden = true;
    }}
  />
{/if}
