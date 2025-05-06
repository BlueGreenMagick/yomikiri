<script lang="ts">
  import { DicEntriesView } from "@/features/dictionary";
  import { onMount } from "svelte";
  import type { AppCtx } from "../ctx";
  import { Platform } from "#platform";

  export let ctx: AppCtx;

  const maxHeight = ctx.config.store("general.tooltip_max_height");

  let entryP = loadEntry();

  async function loadEntry() {
    const result = await Platform.backend.search({ term: "読む" });
    return result.entries[0];
  }

  let updateTick = 0;

  function update() {
    updateTick += 1;
    entryP = loadEntry();
  }

  onMount(() => {
    const configSubscriber = ctx.config.subscribe(update);

    return () => {
      configSubscriber.dispose();
    };
  });
</script>

<div style:--max-height={`${$maxHeight}px`}>
  {#await entryP then entry}
    {#key updateTick}
      <DicEntriesView {ctx} entries={[entry]} />
    {/key}
  {/await}
</div>

<style>
  div {
    position: sticky;
    top: 45px;
    margin-top: 40px;
    max-height: var(--max-height);
    overflow: hidden auto;
    background-color: white;
    border-radius: 4px;
    will-change: transform;
  }
</style>
