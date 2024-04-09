<script lang="ts">
  import GroupedOptions from "../GroupedOptions.svelte";
  import OptionButton from "../items/OptionButton.svelte";
  import type { Dictionary, DictionaryMetadata } from "@platform/dictionary";
  import Utils from "~/utils";

  export let dictionary: Dictionary;

  let dictDescription = "Loading...";
  let disabled = false;
  let dictDescClass = "";

  function update_description(metadata: DictionaryMetadata) {
    const downloadDate = metadata.downloadDate.toDateString();
    dictDescription = `Last updated: ${downloadDate}`;
  }

  async function initialize() {
    const dictionaryMetadata = await dictionary.dictionaryMetadata();
    update_description(dictionaryMetadata);
  }

  async function onClicked() {
    try {
      disabled = true;
      const updating = dictionary.updateDictionary();
      updating.progress.subscribe((value) => {
        dictDescription = value;
      });
      const _dictionaryMetadata = await updating;
      dictDescription = "Successfully updated dictionary!";
      dictDescClass = "success";
    } catch (e) {
      dictDescription = "Error: " + Utils.errorMessage(e);
      console.error(e);
    }
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
