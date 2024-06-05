<script lang="ts">
  import Tooltip from "./Tooltip.svelte";
  import { TokenizeResult } from "@platform/backend";
  import { AnkiApi } from "@platform/anki";
  import type Config from "lib/config";
  import type { Platform } from "@platform";
  import Page from "components/Page.svelte";

  export let platform: Platform;
  export let config: Config;
  export let ankiApi: AnkiApi;
  export let onClose: () => void;
  export let onUpdateHeight: () => void = () => null;

  let tokenizeResult = TokenizeResult.empty();

  export function setTokenizeResult(result: TokenizeResult) {
    tokenizeResult = result;
  }
</script>

<Page>
  <div id="main">
    <Tooltip
      {platform}
      {onClose}
      {config}
      {ankiApi}
      {tokenizeResult}
      {onUpdateHeight}
    />
  </div>
</Page>

<style global>
  #main {
    max-height: 300px;
  }
</style>
