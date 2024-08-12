<script lang="ts">
  import TextButton from "components/TextButton.svelte";
  import type { YomikiriError } from "lib/error";
  import { Toast } from "lib/toast";

  export let err: YomikiriError;
  /** toast id is fed after component is initialized */
  export let toast: Toast | null = null;

  let containsDetails: boolean;
  let details: string;
  let detailsHidden = true;

  $: containsDetails = err.details.length > 1;
  $: details = err.details.join("\n");

  function close() {
    toast?.dismiss()
    throw new Error("unimplemented")
  }
</script>

<div>
  <div>
    <div>{err.message}</div>
    {#if containsDetails}
    <div class="details" class:hidden={detailsHidden}>{details}</div>
    {/if}
  </div>
  {#if containsDetails}
  <div class="btn">
    <TextButton label={detailsHidden ? "details" : "close"} onClick={() => {
      if (detailsHidden) {
        detailsHidden = false;
      } else {
        close()
      }
    }}/>
  </div>
  {/if}
</div>

<style>
  .hidden {
    display: none;
  }
</style>