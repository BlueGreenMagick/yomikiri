<script lang="ts">
  import { platformClass } from "~/components/actions";
  import Tooltip from "./Tooltip.svelte";
  import { TokenizeResult } from "~/backend";

  let tokenizeResult = TokenizeResult.empty();

  export function setTokenizeResult(result: TokenizeResult) {
    tokenizeResult = result;
  }
</script>

<div id="main" use:platformClass>
  <Tooltip {tokenizeResult} on:updateHeight />
</div>

<style global>
  @import "../../global.css";

  #main {
    max-height: 300px;
  }
</style>
