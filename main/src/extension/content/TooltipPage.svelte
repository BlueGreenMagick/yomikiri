<script lang="ts">
  import { platformClass } from "~/components/actions";
  import Tooltip from "./Tooltip.svelte";
  import { TokenizeResult } from "@platform/backend";
  import { AnkiApi } from "@platform/anki";
  import type Config from "~/config";
  import type { Platform } from "@platform";

  export let platform: Platform;
  export let config: Config;
  export let ankiApi: AnkiApi;
  export let onClose: () => void;

  let tokenizeResult = TokenizeResult.empty();

  export function setTokenizeResult(result: TokenizeResult) {
    tokenizeResult = result;
  }
</script>

<div id="main" use:platformClass>
  <Tooltip
    {platform}
    {onClose}
    {config}
    {ankiApi}
    {tokenizeResult}
    on:updateHeight
  />
</div>

<style global>
  @import "../../global.css";

  #main {
    max-height: 300px;
  }
</style>
