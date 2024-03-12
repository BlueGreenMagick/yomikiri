<script lang="ts">
  import type { DictionaryMetadata } from "@platform/backend";
  import GroupedOptions from "../GroupedOptions.svelte";
  import OptionButton from "../items/OptionButton.svelte";
  import { Backend } from "@platform/backend";

  let dictDescription = "Loading...";
  let disabled: boolean = false;
  let dictDescClass = "";

  function update_description(metadata: DictionaryMetadata) {
    const downloadDate = metadata.download_date.toDateString();
    dictDescription = `Last updated: ${downloadDate}`;
  }

  async function initialize() {
    const dictionaryMetadata = await Backend.dictionaryMetadata();
    update_description(dictionaryMetadata);
  }

  async function onClicked() {
    const updating = Backend.updateDictionary();
    disabled = true;
    dictDescription =
      "Updating... It may take about a minute... Don't close the window.";
    const dictionaryMetadata = await updating;
    dictDescription = "Successfully updated dictionary!";
    dictDescClass = "success";
  }

  initialize();
</script>

<GroupedOptions title="Dictionary">
  <OptionButton
    title="Dictionary file"
    buttonText="Update"
    {disabled}
    {onClicked}
  >
    <span class={dictDescClass}>
      {dictDescription}
    </span>
  </OptionButton>
</GroupedOptions>
