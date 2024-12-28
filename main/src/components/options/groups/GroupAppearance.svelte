<script lang="ts">
  import OptionNumber from "../items/OptionNumber.svelte";
  import OptionText from "../items/OptionText.svelte";
  import GroupedOptions from "../GroupedOptions.svelte";
  import Config from "lib/config";

  const config = Config.using();
  const fontSizeConfig = config.store("general.font_size");
  const japaneseFontConfig = config.store("general.font");
  const maxHeightConfig = config.store("general.tooltip_max_height");
</script>

<GroupedOptions title="Appearance">
  <OptionNumber bind:value={$fontSizeConfig} title="Font size" min={9} max={24}>
    Text size (px)
  </OptionNumber>
  <OptionText
    bind:value={$japaneseFontConfig}
    title="Japanese Font"
    wide={true}
  >
    For Japanese text only
  </OptionText>
  <OptionNumber
    bind:value={$maxHeightConfig}
    title="Tooltip max height"
    min={120}
    max={1200}
  >
    Maximum height of dictionary tooltip (px)
  </OptionNumber>
</GroupedOptions>
