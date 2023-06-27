<script lang="ts">
  import { Entry, Sense, type GroupedSense } from "~/dicEntry";
  import IconAddCircle from "@icons/add-circle.svg";
  import { createEventDispatcher } from "svelte";
  import type { MarkerData } from "~/ankiNoteBuilder";

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
  $: posText = group.simplePos.join(", ");
</script>

<div class="grouped-sense">
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
    font-size: 12px;
    margin-bottom: 2px;
    padding: 0 8px;
  }

  .meaning {
    display: flex;
    gap: 2px;
    font-size: 14px;
    align-items: center;
    padding: 0 2px;
  }

  .meaning:hover {
    background-color: rgb(236, 236, 236);
  }

  .meaning:focus-visible {
    outline: none;
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
