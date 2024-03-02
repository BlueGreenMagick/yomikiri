<script lang="ts">
  import { platformClass } from "../components/actions";
  import Tokenize from "../components/dictionary/Tokenize.svelte";
  import { Platform } from "~/platform/iosapp";

  export let initialized: Promise<void>;
  export let context: "app" | "action";
  export let searchText: string;
</script>

<div id="main" use:platformClass>
  {#await initialized then}
    <Tokenize
      bind:searchText
      showCloseButton={context === "action"}
      on:close={() => {
        Platform.messageWebview("close", null);
      }}
    />
  {/await}
</div>

<style global>
  @import "../global.css";

  html,
  html body {
    height: 100%;
  }

  #main {
    height: 100%;
    min-height: 200px;
    min-width: 300px;
    margin: 0 auto;
    padding: 0;

    display: flex;
    flex-direction: column;
  }
</style>
