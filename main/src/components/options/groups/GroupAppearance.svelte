<script lang="ts">
  import OptionNumber from "../items/OptionNumber.svelte";
  import OptionText from "../items/OptionText.svelte";
  import GroupedOptions from "../GroupedOptions.svelte";
  import type Config from "lib/config";

  export let config: Config;

  const fontSizeConfig = config.store("general.font_size");
</script>

<GroupedOptions title="Appearance">
  <OptionNumber bind:value={$fontSizeConfig} title="Font size" min={9} max={24}>
    Text size in pixels
  </OptionNumber>
  <OptionText {config} key="general.font" title="Japanese Font" wide={true}>
    For Japanese text only
  </OptionText>
</GroupedOptions>
