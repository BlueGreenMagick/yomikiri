<script lang="ts">
  import { BrowserApi } from "~/browserApi";
  import GroupedOptions from "./components/GroupedOptions.svelte";
  import OptionClick from "./components/OptionClick.svelte";
</script>

<GroupedOptions title="About">
  <OptionClick
    title="About Yomikiri"
    description={"v" + BrowserApi.manifest().version}
    buttonText="Details"
    disabled={true}
  />
</GroupedOptions>
