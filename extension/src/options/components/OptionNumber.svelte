<script lang="ts">
  import OptionBase from "./OptionBase.svelte";

  export let title: string;
  export let description: string = "";
</script>

<div>
  <OptionBase {title} {description}>
    <input type="number" />
  </OptionBase>
</div>
