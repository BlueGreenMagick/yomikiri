<script lang="ts">
  import { PagePlatform } from "@platform";
  import GroupedOptions from "../GroupedOptions.svelte";
  import OptionButton from "../items/OptionButton.svelte";
  import Utils from "lib/utils";
  import {
    Backend,
    type DesktopBackend,
    type IosAppBackend,
  } from "@platform/backend";
  import type { DictMetadata } from "@yomikiri/yomikiri-rs";

  let dictDescription = "Loading...";
  let disabled = false;
  let dictDescClass = "";

  function update_description(metadata: DictMetadata) {
    const downloadDate = new Date(metadata.download_date);
    dictDescription = `Last updated: ${downloadDate.toLocaleDateString()}`;
  }

  async function initialize() {
    const dictionaryMetadata = await PagePlatform.getDictionaryMetadata();
    update_description(dictionaryMetadata);
  }

  async function onClicked() {
    try {
      disabled = true;
      const backend = (await Backend.instance.get()) as
        | DesktopBackend
        | IosAppBackend;
      const updating = backend.updateDictionary();
      updating.progress.subscribe((value) => {
        dictDescription = value;
      });
      const _dictionaryMetadata = await updating;
      dictDescription = "Successfully updated dictionary!";
      dictDescClass = "success";
    } catch (e) {
      dictDescription = "Error: " + Utils.getErrorMessage(e);
      console.error(e);
    }
  }

  void initialize();
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
