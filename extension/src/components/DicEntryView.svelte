<script lang="ts">
  import { Entry, type GroupedSense } from "~/dicEntry";
  import type { MarkerData } from "~/ankiNoteBuilder";
  import GroupedSenseView from "./GroupedSenseView.svelte";
  import IconAddCircle from "@icons/add-circle.svg";
  import { createEventDispatcher } from "svelte";
  import { RubyString } from "~/japanese";
  import Config from "~/config";

  interface Events {
    addNote: Partial<MarkerData>;
  }

  export let entry: Entry;

  const dispatch = createEventDispatcher<Events>();

  let mainForm: string;
  let readingForForm: string;
  let mainFormRuby: string;
  let groups: GroupedSense[];
  let isCommon: boolean;

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
  $: isCommon = Entry.isCommon(entry);
</script>

<div class="entryView" class:anki={Config.get("anki.enabled")}>
  <div class="header">
    <div class="icon" on:click={() => addNote({})}>{@html IconAddCircle}</div>
    <div>
      <span class="g-japanese-font mainForm">{@html mainFormRuby}</span>
    </div>
  </div>
  {#if isCommon}
    <div class="badge">common</div>
  {/if}
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
  .entryView:not(.anki) {
    margin-left: 3px;
  }

  .header {
    margin: 10px 64px 0 4px;
    display: flex;
    align-items: center;
    gap: 3px;
  }
  .entryView:not(.anki) .icon {
    display: none;
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
    font-size: 1.5em;
  }
  .badge {
    width: max-content;
    font-size: 0.6em;
    color: #8db38d;

    margin-top: 1px;
    padding: 1px 4px;
    border: 1px solid #8db38d;
    border-radius: 3px;
  }
  .entryView.anki .badge {
    margin-left: 8px;
  }
  .groups {
    margin-bottom: 4px;
  }
</style>
