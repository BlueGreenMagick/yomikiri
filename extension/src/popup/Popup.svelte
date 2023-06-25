<script lang="ts">
  import Search from "./Search.svelte";
  import InstallingDictionary from "./InstallingDictionary.svelte";
  import { Api } from "~/api";
  import type { InstallProgress } from "~/dictionary";

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
    min-width: 300px;
    margin: 0 auto;
  }
</style>
