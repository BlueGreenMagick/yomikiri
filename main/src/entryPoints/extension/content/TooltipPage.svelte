<script lang="ts">
  import Tooltip from "./Tooltip.svelte";
  import type { TokenizeResult } from "#platform/backend";
  import Page from "components/Page.svelte";
  import { emptyTokenizeResult } from "platform/shared/backend";

  export let onClose: () => void;
  export let onUpdateHeight: (height: number) => void = (_) => null;

  let tokenizeResult = emptyTokenizeResult();

  export function setTokenizeResult(result: TokenizeResult) {
    tokenizeResult = result;
  }
</script>

<Page>
  <Tooltip {onClose} {tokenizeResult} {onUpdateHeight} />
</Page>
