<script lang="ts">
  import OptionNumber from "../items/OptionNumber.svelte";
  import OptionText from "../items/OptionText.svelte";
  import GroupedOptions from "../GroupedOptions.svelte";
</script>

<GroupedOptions title="Appearance">
  <OptionNumber key="general.font_size" title="Font size" min={9} max={24}>
    Text size in pixels
  </OptionNumber>
  <OptionText key="general.font" title="Japanese Font" wide={true}>
    For japanese text only
  </OptionText>
</GroupedOptions>
