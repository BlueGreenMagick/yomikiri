<script lang="ts">
  import Tokenize from "../components/dictionary/Tokenize.svelte";
  import { Platform } from "~/platform/iosapp";

  export let context: "app" | "action";
  export let searchText: string;
</script>

<Tokenize
  bind:searchText
  showCloseButton={context === "action"}
  onShowAnkiPreview={() => {
    throw "Not yet implemented!";
  }}
  on:close={() => {
    Platform.messageWebview("close", null);
  }}
>
  <div class="container">
    <div class="placeholder">Type in Japanese text</div>
  </div>
</Tokenize>

<style>
  .container {
    flex: 1 1 auto;
    display: flex;
    align-items: center;
  }

  .placeholder {
    flex: 1 1 auto;
    margin: 36px;
    font-size: 18px;
    text-align: center;
    color: var(--text-light);
  }
</style>
