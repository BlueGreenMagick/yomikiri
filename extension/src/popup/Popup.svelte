<script lang="ts">
  import { Api } from "~/api";
  import type { InstallProgress } from "~/dictionary";
  import Search from "./Search.svelte";
  import InstallingDictionary from "./InstallingDictionary.svelte";

  let dictionaryInstalled = true;
  let dictionaryInstallProgress: InstallProgress = { current: 0, total: 0 };

  async function dictionaryCheckInstall() {
    const port = Api.connect("dictionaryCheckInstall");
    port.onMessage.addListener((progress: InstallProgress) => {
      dictionaryInstalled = false;
      dictionaryInstallProgress = progress;
    });
    port.onDisconnect.addListener(() => {
      dictionaryInstalled = true;
    });
  }

  dictionaryCheckInstall();
</script>

<div class="container">
  {#if dictionaryInstalled}
    <Search />
  {:else}
    <InstallingDictionary progress={dictionaryInstallProgress} />
  {/if}
</div>

<style>
  .container {
    height: 100%;
    min-height: 200px;
    min-width: 300px;
    margin: 0 auto;
    padding: 0;
  }
</style>
