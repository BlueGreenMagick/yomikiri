<script lang="ts">
  import { Sense, type GroupedSense } from "lib/dicEntry";
  import type { Config } from "lib/config";
  import type { DicEntriesModel } from "./dicEntriesModel";

  export let config: Config;
  export let model: DicEntriesModel;
  export let group: GroupedSense;
  export let onSelectSense: (sense: Sense) => void;

  const selectedSense = model.selectedSense;
  const ankiEnabledConfig = config.store("anki.enabled");

  let posText: string;

  $: posText = group.pos.join(", ");
</script>

<div class="grouped-sense" class:anki={$ankiEnabledConfig}>
  <div class="part-of-speech">
    {posText}
  </div>
  <div>
    {#each group.senses as sense, idx}
      <div
        class="meaning"
        class:selected={$selectedSense?.sense === sense}
        on:mousedown|stopPropagation={() => {
          onSelectSense(sense);
        }}
      >
        {idx + 1}. {sense.meaning.join(", ")}
      </div>
    {/each}
  </div>
</div>

<style>
  .grouped-sense:first-child {
    margin-top: 0.25rem;
  }

  .grouped-sense {
    margin-top: 0.5rem;
  }

  .part-of-speech {
    color: var(--text-light);
    font-size: 0.9rem;
    margin-bottom: 2px;
    padding: 0 var(--edge-horizontal-padding);
  }

  .meaning {
    font-size: 1rem;
    align-items: center;
    padding: 0 var(--edge-horizontal-padding);
  }

  .grouped-sense.anki .meaning.selected {
    border-left: 2px solid var(--accent);
    padding: 0 calc(var(--edge-horizontal-padding) - 2px);
    background-color: rgba(0, 0, 0, 0.07);
  }

  :global(html.desktop) .grouped-sense.anki .meaning:not(.selected):hover,
  .grouped-sense.anki .meaning:not(.selected):active {
    background-color: rgba(0, 0, 0, 0.04);
  }

  .meaning:focus-visible {
    outline: none;
  }
</style>
