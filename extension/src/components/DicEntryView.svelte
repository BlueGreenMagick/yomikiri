<script lang="ts">
  import { Entry } from "~/dicEntry";
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

  function addNote(data: Partial<MarkerData>) {
    data.entry = entry;
    dispatch("addNote", data);
  }

  $: mainForm = Entry.mainForm(entry);
  $: readingForForm = Entry.readingForForm(entry, mainForm, false).reading;
  $: mainFormRuby = RubyString.toHtml(
    RubyString.generate(mainForm, readingForForm)
  );
  $: groups = Entry.groupSenses(entry);
</script>

<div class="entryView">
  <div class="header">
    <div class="icon" on:click={() => addNote({})}>{@html IconAddCircle}</div>
    <div>
      <span class="g-japanese-font mainForm">{@html mainFormRuby}</span>
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
  .entryView {
    overflow: hidden;
  }
  .header {
    margin: 10px 64px 0 4px;
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
    font-size: 24px;
  }
  .groups {
    margin-bottom: 4px;
  }
</style>
