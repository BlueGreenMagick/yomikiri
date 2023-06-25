<script lang="ts">
  import type { InstallProgress } from "~/dictionary";

  interface Attributes {
    value?: number;
    max?: number;
  }

  export let progress: InstallProgress;

  let hasTotal: boolean;
  let attributes: Attributes;

  function onProgressUpdate(progress: InstallProgress) {
    if (progress.total === -1) {
      hasTotal = false;
      attributes = {};
      return;
    }
    hasTotal = true;
    attributes = {
      value: progress.current,
      max: progress.total,
    };
  }

  $: onProgressUpdate(progress);
</script>

<div class="container">
  <label for="dictionary-install"><b>Installing Dictionary...</b></label>
  {#if hasTotal}
    <span>({progress.current} / {progress.total})</span>
  {/if}
  <progress id="dictionary-install" {...attributes} />
</div>

<style>
  .container {
    width: 100%;
    height: 100%;
    position: relative;
    left: 50vw;
    top: 50vh;
    transform: translate(-50%, -50%);

    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }
  label {
    margin-bottom: 4px;
  }
</style>
