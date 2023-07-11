<script lang="ts">
  import { Platform } from "@platform";
  import { AnkiApi } from "@platform/anki";
  import Utils from "~/utils";
  import GroupedOptions from "./components/GroupedOptions.svelte";
  import OptionClick from "./components/OptionClick.svelte";
  import OptionNumber from "./components/OptionNumber.svelte";
  import ModalAnkiTemplate from "./ModalAnkiTemplate.svelte";
  import { ankiTemplateModalHidden } from "./stores";

  let ankiTemplateDescription = "";

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
</script>

<GroupedOptions title="Anki">
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
    on:trigger={openAnkiTemplateModal}
  />
</GroupedOptions>
<ModalAnkiTemplate
  hidden={$ankiTemplateModalHidden}
  on:close={() => {
    $ankiTemplateModalHidden = true;
  }}
/>
