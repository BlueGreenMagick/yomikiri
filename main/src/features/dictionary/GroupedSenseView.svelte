<script lang="ts">
  import {
    miscDisplayText,
    type PartOfSpeech,
    type Sense,
  } from "@/features/dicEntry";

  import type { DicEntriesModel } from "./dicEntriesModel";
  import type { GroupedSense } from "@yomikiri/backend-bindings";
  import type { AppCtx } from "../ctx";

  export let ctx: AppCtx;
  export let model: DicEntriesModel;
  export let group: GroupedSense;
  export let onSelectSense: (sense: Sense, poss: PartOfSpeech[]) => void;

  const selectedSense = model.selectedMeaning;
  const ankiEnabledConfig = ctx.config.store("anki.enabled");

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
          onSelectSense(sense, group.pos);
        }}
      >
        {idx + 1}. {sense.meanings.join(", ")}{#if sense.misc.length > 0}<span
            class="misc"
            >{sense.misc.map((m) => miscDisplayText(m)).join(", ")}</span
          >{/if}
      </div>
    {/each}
  </div>
</div>

<style>
  .grouped-sense {
    margin-top: 0.5rem;
  }

  .part-of-speech {
    color: var(--text-light);
    font-size: 0.875rem;
    line-height: 1;
    margin: 0.25rem 0;
    padding: 0 var(--edge-horizontal-padding);
  }

  .meaning {
    font-size: 1rem;
    align-items: center;
    padding: 0 var(--edge-horizontal-padding);
  }

  .grouped-sense.anki .meaning.selected {
    border-left: 2px solid var(--accent);
    padding: 0;
    padding-left: calc(var(--edge-horizontal-padding) - 2px);
    padding-right: var(--edge-horizontal-padding);
    background-color: rgba(0, 0, 0, 0.07);
  }

  :global(html.desktop) .grouped-sense.anki .meaning:not(.selected):hover,
  .grouped-sense.anki .meaning:not(.selected):active {
    background-color: rgba(0, 0, 0, 0.04);
  }

  .meaning:focus-visible {
    outline: none;
  }

  .misc {
    color: var(--text-faint);
    font-size: 0.875rem;
    user-select: none;
    margin-left: 0.5rem;
  }
</style>
