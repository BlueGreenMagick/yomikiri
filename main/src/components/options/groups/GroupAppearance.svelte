<script lang="ts">
  import OptionNumber from "../items/OptionNumber.svelte";
  import OptionText from "../items/OptionText.svelte";
  import GroupedOptions from "../GroupedOptions.svelte";
  import Config from "lib/config";

  const config = Config.using();
  const fontSizeConfig = config.store("general.font_size");
  const japaneseFontConfig = config.store("general.font");
</script>

<GroupedOptions title="Appearance">
  <OptionNumber bind:value={$fontSizeConfig} title="Font size" min={9} max={24}>
    Text size in pixels
  </OptionNumber>
  <OptionText
    bind:value={$japaneseFontConfig}
    title="Japanese Font"
    wide={true}
  >
    For Japanese text only
  </OptionText>
</GroupedOptions>
