<script lang="ts">
  import OptionNumber from "./components/OptionNumber.svelte";
  import OptionText from "./components/OptionText.svelte";
  import GroupedOptions from "./components/GroupedOptions.svelte";
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
  />
</GroupedOptions>
