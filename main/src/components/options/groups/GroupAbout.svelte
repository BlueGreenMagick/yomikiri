<script lang="ts">
  import { Platform } from "@platform";
  import GroupedOptions from "../GroupedOptions.svelte";
  import OptionClick from "../items/OptionClick.svelte";
  import ModalThirdParty from "../modals/ModalThirdParty.svelte";

  let modalThirdPartyVisible = false;
  let versionString = "Loading version...";

  async function initialize() {
    await Platform.versionInfo();
    const versionInfo = await Platform.versionInfo();
    versionString = "v" + versionInfo.version;
  }

  initialize();
</script>

<GroupedOptions title="About">
  <OptionClick
    title="About Yomikiri"
    description={versionString}
    buttonText="Details"
    disabled={true}
  />
  <OptionClick
    title="Third party licenses"
    description={"View licenses for third party open source libraries & resources"}
    buttonText={"View"}
    on:trigger={() => {
      modalThirdPartyVisible = true;
    }}
  />
</GroupedOptions>

{#if modalThirdPartyVisible}
  <ModalThirdParty
    on:close={() => {
      modalThirdPartyVisible = false;
    }}
  />
{/if}
