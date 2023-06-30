<script lang="ts">
  import OptionNumber from "./components/OptionNumber.svelte";
  import OptionText from "./components/OptionText.svelte";
  import OptionsGroup from "./components/OptionsGroup.svelte";
</script>

<OptionsGroup title="Appearance">
  <OptionNumber
    key="general.font_size"
    title="Font size"
    description="Text size in pixels"
  />
  <OptionText
    key="general.font"
    title="Japanese Font"
    description="For japanese text only."
  />
</OptionsGroup>
