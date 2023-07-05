<script lang="ts">
  import { Platform } from "@platform";
  import { AnkiApi } from "@platform/anki";
  import Utils from "~/utils";
  import GroupedOptions from "./components/GroupedOptions.svelte";
  import OptionClick from "./components/OptionClick.svelte";
  import OptionNumber from "./components/OptionNumber.svelte";
  import ModalAnkiTemplate from "./ModalAnkiTemplate.svelte";
  import { ankiTemplateModalHidden } from "./stores";

  //ios only
  let testConnectionDescription = Platform.IS_IOS
    ? "Click to test connction with AnkiMobile"
    : "Click to test connection with AnkiConnect";
  // shared
  let modalTemplateHidden = true;

  async function testConnection() {
    if (Platform.IS_IOS) {
      testConnectionDescription = "Connecting to AnkiMobile... (Unimplemented)";
    } else {
      testConnectionDescription = "Connecting to AnkiConnect...";
    }
    try {
      await AnkiApi.checkConnection();
      testConnectionDescription =
        "<span class='success'>Successfully connected!</span>";
    } catch (err) {
      console.error(err);
      let errorMsg;
      if (err instanceof Error) {
        errorMsg = `${err.name}: ${Utils.escapeHTML(err.message)}`;
      } else {
        errorMsg = "Unknown error: check the browser console for details";
      }
      testConnectionDescription = `<span class="warning">${errorMsg}</span>`;
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
    title="Test connection"
    description={testConnectionDescription}
    buttonText="Test"
    on:trigger={async () => {
      await testConnection();
    }}
  />
  <OptionClick
    title="Configure Anki template"
    buttonText="Configure"
    on:trigger={() => {
      if (AnkiApi.canGetAnkiInfo()) {
        $ankiTemplateModalHidden = false;
      } else {
        // @ts-ignore
        AnkiApi.requestAnkiInfo();
      }
    }}
  />
</GroupedOptions>
<ModalAnkiTemplate
  hidden={$ankiTemplateModalHidden}
  on:close={() => {
    $ankiTemplateModalHidden = true;
  }}
/>
