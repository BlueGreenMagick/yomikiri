<script lang="ts">
  import { Entry, type GroupedSense, type Reading } from "~/dicEntry";
  import type { MarkerData } from "~/ankiNoteBuilder";
  import GroupedSenseView from "./GroupedSenseView.svelte";
  import IconAddCircle from "@icons/add-circle.svg";
  import { createEventDispatcher } from "svelte";
  import { RubyString } from "~/japanese";

  interface Events {
    addNote: Partial<MarkerData>;
  }

  export let entry: Entry;

  const dispatch = createEventDispatcher<Events>();

  let mainForm: string;
  let readingsString: string;
  let groups: GroupedSense[];

  function makeReadingsString(readings: Reading[]): string {
    return readings
      .slice(1)
      .map((r) => r.reading)
      .join(", ");
  }

  function addNote(data: Partial<MarkerData>) {
    data.entry = entry;
    dispatch("addNote", data);
  }

  $: mainForm = Entry.mainForm(entry);
  $: mainFormRuby = RubyString.toHtml(
    RubyString.generate(mainForm, entry.readings[0].reading)
  );
  $: readingsString = makeReadingsString(entry.readings);
  $: groups = Entry.groupSenses(entry);
</script>

<div class="entryView">
  <div class="header">
    <div class="icon" on:click={() => addNote({})}>{@html IconAddCircle}</div>
    <div>
      <span class="mainForm">{@html mainFormRuby}</span>
      <span class="reading">{readingsString}</span>
    </div>
  </div>
  <div class="groups">
    {#each groups as group}
      <GroupedSenseView
        {group}
        on:addNote={(ev) => {
          addNote(ev.detail);
        }}
      />
    {/each}
  </div>
</div>

<style>
  .header {
    height: var(--header-height);
    position: sticky;
    margin-right: var(--close-button-width);
    padding: 6px 0 0 4px;
    display: flex;
    align-items: center;
    gap: 3px;
  }
  .icon {
    width: 15px;
    height: 15px;
    opacity: 0.2;
    fill: green;
  }
  .icon:hover {
    opacity: 0.6;
    cursor: pointer;
  }
  .mainForm {
    font-size: 20px;
  }
  .reading {
    color: grey;
    font-size: 12px;
    margin-left: 4px;
  }
</style>
