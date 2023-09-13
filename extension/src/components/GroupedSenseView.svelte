<script lang="ts">
  import { Sense, type GroupedSense } from "~/dicEntry";
  import Config from "~/config";
  import { createEventDispatcher } from "svelte";
  import type { DicEntriesModel } from "./dicEntriesModel";

  interface Events {
    selectSense: Sense;
  }

  export let model: DicEntriesModel;
  export let group: GroupedSense;

  const selectedSense = model.selectedSense;

  const dispatch = createEventDispatcher<Events>();

  let posText: string;

  function onSelectSense(sense: Sense) {
    dispatch("selectSense", sense);
  }

  $: posText = group.pos.join(", ");
</script>

<div class="grouped-sense" class:anki={Config.get("anki.enabled")}>
  <div class="part-of-speech">
    {posText}
  </div>
  <div>
    {#each group.senses as sense, idx}
      <div
        class="meaning"
        class:selected={$selectedSense?.sense === sense}
        on:mousedown|stopPropagation={() => onSelectSense(sense)}
      >
        {idx + 1}. {sense.meaning.join(", ")}
      </div>
    {/each}
  </div>
</div>

<style>
  .grouped-sense:first-child {
    margin-top: 0px;
  }

  .grouped-sense {
    margin-top: 4px;
  }

  .part-of-speech {
    color: var(--text-light);
    font-size: 0.9em;
    margin-bottom: 2px;
    padding: 0 8px;
  }

  .meaning {
    font-size: 1em;
    align-items: center;
    padding: 0 8px;
  }

  .grouped-sense.anki .meaning.selected {
    border-left: 2px solid var(--accent);
    padding: 0 6px;
    background-color: rgba(0, 0, 0, 0.07);
  }

  .grouped-sense.anki .meaning:not(.selected):hover {
    background-color: rgba(0, 0, 0, 0.04);
  }

  .meaning:focus-visible {
    outline: none;
  }
</style>
