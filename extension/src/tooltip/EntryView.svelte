<script lang="ts">
  import type { Entry, GroupedSense, Reading } from "~/dictionary";
  import GroupedSenseView from "./GroupedSenseView.svelte";

  export let entry: Entry;

  let mainForm: string;
  let readingsString: string;
  let groups: GroupedSense[];

  function makeReadingsString(readings: Reading[]): string {
    if (readings.length === 1 && readings[0].reading === mainForm) {
      return "";
    }
    return readings.map((r) => r.reading).join(", ");
  }

  $: mainForm = entry.mainForm();
  $: readingsString = makeReadingsString(entry.readings);
  $: groups = entry.groupSenses();
</script>

<div class="entryView">
  <div class="header">
    <span class="mainForm">{mainForm}</span>
    <span class="reading">{readingsString}</span>
  </div>
  <div class="groups">
    {#each groups as group}
      <GroupedSenseView {group} />
    {/each}
  </div>
</div>

<style>
  .entryView {
    padding: 8px;
  }
  .mainForm {
    font-size: 20px;
  }
  .reading {
    color: grey;
    font-size: 12px;
  }

  .header {
    height: var(--header-height);
    position: sticky;
    margin-right: var(--close-button-width);
  }
</style>
