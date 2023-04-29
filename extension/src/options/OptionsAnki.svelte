<script lang="ts">
  import AnkiApi from "~/api/anki";
  import Utils from "~/utils";
  import OptionsGroup from "./components/OptionsGroup.svelte";
  import OptionClick from "./components/OptionClick.svelte";
  import OptionNumber from "./components/OptionNumber.svelte";
  import ModalAnkiTemplate from "./ModalAnkiTemplate.svelte";

  let testConnectionDescription = "Click to test connection with AnkiConnect";
  let modalAnkiTemplateHidden = true;

  async function testConnection() {
    const result = await AnkiApi.checkConnection();
    if (result === null) {
      testConnectionDescription =
        "<span style='color: green;'>Successfully connected!</span>";
    } else {
      const error = Utils.escapeHTML(result);
      testConnectionDescription = `<span style='color: red;'>Error: ${error}</span>`;
    }
  }
</script>

<OptionsGroup title="Anki">
  <OptionNumber
    title="AnkiConnect port number"
    description="This is the AnkiConnect config `webBindPort`"
  />
  <OptionClick
    title="Test connection"
    description={testConnectionDescription}
    on:trigger={testConnection}
  />
  <OptionClick
    title="Setup Anki template"
    on:trigger={() => {
      modalAnkiTemplateHidden = false;
    }}
  />
  <ModalAnkiTemplate
    hidden={modalAnkiTemplateHidden}
    on:close={() => {
      modalAnkiTemplateHidden = true;
    }}
  />
</OptionsGroup>
