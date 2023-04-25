<script lang="ts">
  import type { Entry } from "../dictionary";

  import Senses from "./Senses.svelte";

  export let entry: Entry;

  $: mainForm = entry.mainForm();
</script>

<div>
  <div class="mainForm">{mainForm}</div>
  <div class="reading">{entry.readings[0].reading}</div>
  <Senses {entry} />
</div>
