<script lang="ts">
  import { emptyTokenizeResult } from "@/platform/shared/backend";
  import type { TokenizeResult } from "@yomikiri/backend-bindings";
  import LoadingPage from "../components/LoadingPage.svelte";
  import PageSetup from "../components/PageSetup.svelte";
  import type { AppCtx } from "../ctx";
  import Tooltip from "./Tooltip.svelte";

  export let initialize: () => Promise<AppCtx> | AppCtx;
  export let onClose: () => void;
  export let onUpdateHeight: (height: number) => void = (_) => null;

  let tokenizeResult = emptyTokenizeResult();

  export function setTokenizeResult(result: TokenizeResult) {
    tokenizeResult = result;
  }
</script>

{#await initialize()}
  <LoadingPage />
{:then ctx}
  <PageSetup {ctx} />
  <Tooltip {ctx} {onClose} {tokenizeResult} {onUpdateHeight} />
{:catch}
  Error!
{/await}
