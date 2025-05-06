<script lang="ts">
  import Tooltip from "./Tooltip.svelte";
  import type { TokenizeResult } from "@yomikiri/backend-bindings";
  import { emptyTokenizeResult } from "@/platform/shared/backend";
  import type { AppContext } from "../context";
  import PageSetup from "../components/PageSetup.svelte";
  import LoadingPage from "../components/LoadingPage.svelte";

  export let initialize: () => Promise<AppContext>;
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
