<script lang="ts">
  import OptionNumber from "../items/OptionNumber.svelte";
  import OptionText from "../items/OptionText.svelte";
  import GroupedOptions from "../GroupedOptions.svelte";
</script>

<GroupedOptions title="Appearance">
  <OptionNumber
    key="general.font_size"
    title="Font size"
    description="Text size in pixels"
    min={9}
    max={24}
  />
  <OptionText
    key="general.font"
    title="Japanese Font"
    description="For japanese text only."
    wide={true}
  />
</GroupedOptions>
