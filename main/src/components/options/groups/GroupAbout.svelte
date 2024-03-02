<script lang="ts">
  import { Platform } from "@platform";
  import GroupedOptions from "../GroupedOptions.svelte";
  import OptionClick from "../items/OptionClick.svelte";
  import ModalThirdParty from "../modals/ModalThirdParty.svelte";
  import OptionBase from "../items/OptionBase.svelte";

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
  <OptionBase title="About Yomikiri" description={versionString} />
  <OptionClick
    title="Third party licenses"
    description={"View licenses for third party open source libraries & resources"}
    buttonText={"View"}
    on:trigger={() => {
      modalThirdPartyVisible = true;
    }}
  />
  <OptionClick
    title="View source code"
    description={"Yomikiri is an open source project! You can view the code on GitHub."}
    buttonText={"GitHub"}
    on:trigger={() => {
      window
        .open("https://github.com/bluegreenmagick/yomikiri", "_blank")
        ?.focus();
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
