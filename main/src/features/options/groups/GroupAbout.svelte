<script lang="ts">
  import type { AppCtx } from "@/features/ctx";
  import GroupedOptions from "../GroupedOptions.svelte";
  import OptionBase from "../items/OptionBase.svelte";
  import OptionClick from "../items/OptionClick.svelte";
  import ModalThirdParty from "../modals/ModalThirdParty.svelte";

  export let ctx: AppCtx;

  let modalThirdPartyVisible = false;
  let versionStringP = getVersionString();

  async function getVersionString() {
    const versionInfo = await ctx.platform.versionInfo();
    return "v" + versionInfo.version;
  }
</script>

<GroupedOptions title="About">
  <OptionBase title="About Yomikiri">
    {#await versionStringP}
      Loading version.
    {:then versionString}
      {versionString}
    {/await}
  </OptionBase>
  <OptionClick
    title="Third party licenses"
    buttonText="View"
    onClick={() => {
      modalThirdPartyVisible = true;
    }}
  >
    View licenses for third party open source libraries & resources
  </OptionClick>
  <OptionClick
    title="View source code"
    buttonText="GitHub"
    onClick={() => {
      ctx.platform.openExternalLink(
        "https://github.com/bluegreenmagick/yomikiri",
      );
    }}
  >
    Yomikiri is an open source project! You can view the code on GitHub.
  </OptionClick>
</GroupedOptions>

{#if modalThirdPartyVisible}
  <ModalThirdParty
    onClose={() => {
      modalThirdPartyVisible = false;
    }}
  />
{/if}
