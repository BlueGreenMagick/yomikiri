<script lang="ts">
  import type { Platform } from "@platform";
  import GroupedOptions from "../GroupedOptions.svelte";
  import OptionClick from "../items/OptionClick.svelte";
  import ModalThirdParty from "../modals/ModalThirdParty.svelte";
  import OptionBase from "../items/OptionBase.svelte";

  export let platform: Platform;

  let modalThirdPartyVisible = false;
  let versionString = "Loading version...";

  async function initialize() {
    await platform.versionInfo();
    const versionInfo = await platform.versionInfo();
    versionString = "v" + versionInfo.version;
  }

  initialize();
</script>

<GroupedOptions title="About">
  <OptionBase title="About Yomikiri">{versionString}</OptionBase>
  <OptionClick
    title="Third party licenses"
    buttonText={"View"}
    on:trigger={() => {
      modalThirdPartyVisible = true;
    }}
  >
    View licenses for third party open source libraries & resources
  </OptionClick>
  <OptionClick
    title="View source code"
    buttonText={"GitHub"}
    on:trigger={() => {
      platform.openExternalLink("https://github.com/bluegreenmagick/yomikiri");
    }}
  >
    Yomikiri is an open source project! You can view the code on GitHub.
  </OptionClick>
</GroupedOptions>

{#if modalThirdPartyVisible}
  <ModalThirdParty
    on:close={() => {
      modalThirdPartyVisible = false;
    }}
  />
{/if}
