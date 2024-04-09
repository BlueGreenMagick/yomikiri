<script lang="ts">
  import OptionNumber from "../items/OptionNumber.svelte";
  import OptionText from "../items/OptionText.svelte";
  import GroupedOptions from "../GroupedOptions.svelte";
  import type Config from "~/config";

  export let config: Config;
</script>

<GroupedOptions title="Appearance">
  <OptionNumber
    {config}
    key="general.font_size"
    title="Font size"
    min={9}
    max={24}
  >
    Text size in pixels
  </OptionNumber>
  <OptionText {config} key="general.font" title="Japanese Font" wide={true}>
    For Japanese text only
  </OptionText>
</GroupedOptions>
