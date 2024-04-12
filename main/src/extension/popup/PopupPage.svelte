<script lang="ts">
  import { platformClass } from "~/components/actions";
  import { Platform } from "@platform";
  import { Backend } from "@platform/backend";
  import type Config from "~/config";
  import PopupView from "./PopupView.svelte";
  import ActionButtons from "./ActionButtons.svelte";
  import type { AnkiApi } from "@platform/anki";

  export let platform: Platform;
  export let initialized: Promise<[Config, Backend, AnkiApi]>;
</script>

<div id="main" use:platformClass>
  {#await initialized then [config, backend, ankiApi]}
    {#if Platform.IS_IOS}
      <ActionButtons {platform} {config} />
    {:else}
      <PopupView {platform} {backend} {config} {ankiApi} />
    {/if}
  {/await}
</div>

<style global>
  @import "../../global.css";

  /** 
  in desktop, body height should change according to content height
  in ios, body should fill the entire popup height
  */
  html.ios,
  html.ios body {
    height: 100%;
  }

  #main {
    height: 100%;
    min-height: 200px;
    margin: 0 auto;
    padding: 0;
    overflow-y: auto;

    display: flex;
    flex-direction: column;
  }

  html.desktop body {
    width: 360px;
  }

  :global(.ios) #main {
    max-height: 100%;
  }

  :global(.desktop) #main {
    max-height: 600px;
  }
</style>
