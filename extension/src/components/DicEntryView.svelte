<script lang="ts" context="module">
  export interface AddNoteForEntry {
    entry: Entry;
    sense?: Sense;
  }

  interface Events {
    addNote: AddNoteForEntry;
  }
</script>

<script lang="ts">
  import { Entry, Sense, type GroupedSense } from "~/dicEntry";
  import GroupedSenseView from "./GroupedSenseView.svelte";
  import IconAddCircleOutline from "@icons/add-circle-outline.svg";
  import { createEventDispatcher } from "svelte";
  import { RubyString } from "~/japanese";
  import Config from "~/config";

  export let entry: Entry;

  const dispatch = createEventDispatcher<Events>();

  let mainForm: string;
  let readingForForm: string;
  let mainFormRuby: string;
  let groups: GroupedSense[];
  let isCommon: boolean;
  let hasBadges: boolean;
  let selectedSense: Sense | null = null;

  function addNote() {
    const sense = selectedSense ?? undefined;
    dispatch("addNote", {
      entry,
      sense,
    });
  }

  function onSelectSense(ev: CustomEvent<Sense>) {
    selectedSense = ev.detail;
  }

  function onUnselectSense() {
    selectedSense = null;
  }

  $: mainForm = Entry.mainForm(entry);
  $: readingForForm = Entry.readingForForm(entry, mainForm, false).reading;
  $: mainFormRuby = RubyString.toHtml(
    RubyString.generate(mainForm, readingForForm)
  );
  $: groups = Entry.groupSenses(entry);
  $: isCommon = Entry.isCommon(entry);
  $: hasBadges = isCommon;
</script>

<div class="entryView">
  <div class="header">
    <div class="term">
      <span class="g-japanese-font mainForm">{@html mainFormRuby}</span>
    </div>
    <div class="icons">
      {#if Config.get("anki.enabled")}
        <div
          class="icon"
          class:highlight={selectedSense !== null}
          on:click={addNote}
          on:mousedown|preventDefault={() => {}}
        >
          {@html IconAddCircleOutline}
        </div>
      {/if}
    </div>
  </div>
  {#if hasBadges}
    <div class="badges">
      {#if isCommon}
        <div class="badge">common</div>
      {/if}
    </div>
  {/if}
  <div class="groups">
    {#each groups as group}
      <GroupedSenseView
        {group}
        on:selectSense={onSelectSense}
        on:unselectSense={onUnselectSense}
      />
    {/each}
  </div>
</div>

<style>
  .entryView {
    overflow: hidden;
  }

  .header {
    margin: 4px 4px 0 4px;
    display: flex;
  }
  .term {
    flex: 1 1 auto;
    margin: 4px 12px 0px 4px;
  }
  .icons {
    flex: 0 0 auto;

    display: flex;
  }
  .icon {
    width: 24px;
    height: 24px;
    padding: 4px;
    color: #777777;
    fill: #777777;
  }
  .icon:hover {
    color: black;
    fill: black;
    cursor: pointer;
    background-color: rgba(0, 0, 0, 0.07);
    border-radius: 3px;
  }
  .icon.highlight {
    color: #ff6080;
    fill: #ff6080;
  }
  .mainForm {
    font-size: 1.5em;
  }
  .badges {
    margin: 0 6px 4px 6px;
    display: flex;
    gap: 4px;
  }
  .badge {
    width: max-content;
    font-size: 0.6em;
    color: #8db38d;
    padding: 1px 4px;
    border: 1px solid #8db38d;
    border-radius: 3px;
  }

  .groups {
    margin-bottom: 8px;
  }
</style>
