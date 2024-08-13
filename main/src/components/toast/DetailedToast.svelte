<script lang="ts">
  import TextButton from "components/TextButton.svelte";
  import { Toast } from "lib/toast";

  export let message: string;
  export let details: string | undefined;
  export let toast: Toast;

  let detailsHidden = true;

  function close() {
    toast.dismiss()
  }

  function btnClicked() {
    if (detailsHidden) {
      detailsHidden = false
      // make toast stay alive
      toast.update({opts: {duration: 99999999}})
    } else {
      close()
    }
  }
</script>

<div class="detailed-toast">
  <div>
    <div class="message">{message}</div>
    {#if details}
    <div class="details" class:hidden={detailsHidden}>{details}</div>
    {/if}
  </div>
  {#if details}
  <div class="btn">
    <TextButton label={detailsHidden ? "details" : "close"} onClick={btnClicked}/>
  </div>
  {/if}
</div>

<style>
  .hidden {
    display: none;
  }

  .detailed-toast {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .btn {
    flex: 0 0 auto;
  }

  .details {
    color: var(--text-light);
    margin-top: 8px;
  }
</style>