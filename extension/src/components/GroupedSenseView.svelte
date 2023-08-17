<script lang="ts">
  import { Sense, type GroupedSense } from "~/dicEntry";
  import IconAddCircle from "@icons/add-circle.svg";
  import { createEventDispatcher } from "svelte";
  import type { MarkerData } from "~/ankiNoteBuilder";
  import Config from "~/config";

  interface Events {
    addNote: Partial<MarkerData>;
  }

  export let group: GroupedSense;

  let posText: string;

  const dispatch = createEventDispatcher<Events>();

  function addAnkiNote(sense: Sense) {
    dispatch("addNote", {
      selectedMeaning: sense,
    });
  }
  $: posText = group.pos.join(", ");
</script>

<div class="grouped-sense" class:anki={Config.get("anki.enabled")}>
  <div class="part-of-speech">
    {posText}
  </div>
  <div>
    {#each group.senses as sense, idx}
      <div class="meaning" tabindex="-1">
        <div class="anki-add" on:click={() => addAnkiNote(sense)}>
          {@html IconAddCircle}
        </div>
        <div class="meaning-text">{idx + 1}. {sense.meaning.join(", ")}</div>
      </div>
    {/each}
  </div>
</div>

<style>
  .grouped-sense {
    margin-top: 4px;
  }

  .part-of-speech {
    color: grey;
    font-size: 0.9em;
    margin-bottom: 2px;
    padding: 0 8px;
  }

  .meaning {
    display: flex;
    gap: 2px;
    font-size: 1em;
    align-items: center;
    padding: 0 2px;
  }

  .grouped-sense.anki .meaning:hover {
    background-color: rgb(236, 236, 236);
  }

  .meaning:focus-visible {
    outline: none;
  }
  .grouped-sense:not(.anki) .anki-add {
    display: none;
  }
  .anki-add {
    flex: 0 0 12px;
    height: 12px;
    fill: green;
    visibility: hidden;
  }

  .meaning:hover .anki-add {
    visibility: visible;
    opacity: 0.3;
  }

  .anki-add:hover {
    visibility: visible;
    opacity: 0.6 !important;
    cursor: pointer;
  }

  .meaning-text {
    flex: 1 1 auto;
  }
</style>
