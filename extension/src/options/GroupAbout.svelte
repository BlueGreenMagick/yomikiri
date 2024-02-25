<script lang="ts">
  import { BrowserApi } from "~/browserApi";
  import GroupedOptions from "./components/GroupedOptions.svelte";
  import OptionClick from "./components/OptionClick.svelte";
  import ModalAnkiTemplate from "./ModalAnkiTemplate.svelte";
  import ModalThirdParty from "./ModalThirdParty.svelte";

  let modalThirdPartyVisible = false;
</script>

<GroupedOptions title="About">
  <OptionClick
    title="About Yomikiri"
    description={"v" + BrowserApi.manifest().version}
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
