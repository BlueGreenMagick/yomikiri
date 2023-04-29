<script lang="ts">
  import OptionsGroup from "./components/OptionsGroup.svelte";
  import OptionClick from "./components/OptionClick.svelte";
  import OptionNumber from "./components/OptionNumber.svelte";
</script>

<OptionsGroup title="Anki">
  <OptionNumber
    title="AnkiConnect port number"
    description="This is the AnkiConnect config `webBindPort`"
  />
  <OptionClick title="Setup Anki template" />
</OptionsGroup>
