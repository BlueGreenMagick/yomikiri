<script lang="ts">
  import Tooltip from "./Tooltip.svelte";
  import { TokenizeResult } from "@platform/backend";
  import Page from "components/Page.svelte";

  export let onClose: () => void;
  export let onUpdateHeight: () => void = () => null;

  let tokenizeResult = TokenizeResult.empty();

  export function setTokenizeResult(result: TokenizeResult) {
    tokenizeResult = result;
  }
</script>

<Page>
  <div id="main">
    <Tooltip {onClose} {tokenizeResult} {onUpdateHeight} />
  </div>
</Page>

<style global>
  #main {
    max-height: 300px;
  }
</style>
