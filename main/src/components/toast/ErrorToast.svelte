<script lang="ts">
  import TextButton from "components/TextButton.svelte";

  export let msg: string;
</script>

<div>
  {msg}
  <TextButton label="details"/>
</div>