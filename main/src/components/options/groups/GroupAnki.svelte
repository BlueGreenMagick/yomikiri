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
  let useAnkiDescription = "";
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
      useAnkiDescription =
        "<span class='success'>Successfully connected to Anki.</span>";
    } catch (err) {
      let errorMsg = Utils.errorMessage(err);
      useAnkiDescription = `<span class="warning">${errorMsg}</span>`;

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
      useAnkiDescription = "Connecting to Anki...";
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