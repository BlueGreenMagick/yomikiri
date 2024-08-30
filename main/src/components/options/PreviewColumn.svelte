<script lang="ts">
  import DicEntriesView from "../dictionary/DicEntriesView.svelte";
  import { Config } from "lib/config";
  import { onMount } from "svelte";
  import { Backend } from "@platform/backend";

  const config = Config.using();

  let entryP = loadEntry();

  async function loadEntry() {
    const result = await Backend.search({ term: "読む" });
    return result.entries[0];
  }

  let updateTick = 0;

  function update() {
    updateTick += 1;
    entryP = loadEntry();
  }

  onMount(() => {
    const configSubscriber = config.subscribe(update);

    return () => {
      configSubscriber.dispose();
    };
  });
</script>

<div>
  {#await entryP then entry}
    {#key updateTick}
      <DicEntriesView entries={[entry]} />
    {/key}
  {/await}
</div>

<style>
  div {
    position: sticky;
    top: 45px;
    margin-top: 40px;
    max-height: 300px;
    overflow: hidden auto;
    background-color: white;
    border-radius: 4px;
    will-change: transform;
  }
</style>
