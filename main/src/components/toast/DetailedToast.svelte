<script lang="ts">
  import TextButton from "components/TextButton.svelte";
  import { Toast } from "lib/toast";

  export let message: string;
  export let details: string | undefined;
  export let toast: Toast;

  let containsDetails: boolean;
  let detailsHidden = true;

  function close() {
    toast.dismiss()
    throw new Error("unimplemented")
  }
</script>

<div>
  <div>
    <div>{message}</div>
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