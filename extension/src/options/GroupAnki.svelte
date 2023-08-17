<script lang="ts">
  import { Platform } from "@platform";
  import { AnkiApi } from "@platform/anki";
  import Utils from "~/utils";
  import GroupedOptions from "./components/GroupedOptions.svelte";
  import OptionClick from "./components/OptionClick.svelte";
  import OptionNumber from "./components/OptionNumber.svelte";
  import ModalAnkiTemplate from "./ModalAnkiTemplate.svelte";
  import { ankiTemplateModalHidden } from "./stores";
  import OptionToggle from "./components/OptionToggle.svelte";
  import Config from "~/config";

  const defaultUseAnkiDescription =
    "<a href='https://apps.ankiweb.net/'>Anki</a> is a popular flashcard software.";
  const successUseAnkiDescription =
    "<span class='success'>Successfully connected to Anki.</span>";

  let ankiTemplateDescription = "";
  let ankiEnabled: boolean;
  let ankiDisabled: boolean;
  let useAnkiDescription = Config.get("anki.enabled")
    ? successUseAnkiDescription
    : defaultUseAnkiDescription;

  async function openAnkiTemplateModal() {
    try {
      ankiTemplateDescription = "";
      let ok = await AnkiApi.canGetAnkiInfo();
      if (ok) {
        $ankiTemplateModalHidden = false;
      } else {
        ankiTemplateDescription = "Retrieving information from Anki...";
        AnkiApi.requestAnkiInfo();
      }
    } catch (err) {
      console.error(err);
      let errorMsg;
      if (err instanceof Error) {
        errorMsg = `${err.name}: ${Utils.escapeHTML(err.message)}`;
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
      useAnkiDescription = successUseAnkiDescription;
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

  async function onAnkiEnableChange() {
    if (ankiEnabled) {
      checkAnkiConnection();
    } else {
      useAnkiDescription = defaultUseAnkiDescription;
    }
  }

  $: ankiDisabled = !ankiEnabled;
</script>

<GroupedOptions title="Anki">
  <OptionToggle
    key="anki.enabled"
    title="Use Anki"
    description={useAnkiDescription}
    bind:value={ankiEnabled}
    on:click={onAnkiEnableChange}
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
<ModalAnkiTemplate
  hidden={$ankiTemplateModalHidden}
  on:close={() => {
    $ankiTemplateModalHidden = true;
  }}
/>
