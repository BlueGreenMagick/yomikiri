<script lang="ts">
  import { type GroupedSense } from "~/dicEntry";
  import Config from "~/config";

  export let group: GroupedSense;

  let posText: string;

  $: posText = group.pos.join(", ");
</script>

<div class="grouped-sense" class:anki={Config.get("anki.enabled")}>
  <div class="part-of-speech">
    {posText}
  </div>
  <div>
    {#each group.senses as sense, idx}
      <div class="meaning" tabindex="-1">
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
    color: grey;
    font-size: 0.9em;
    margin-bottom: 2px;
    padding: 0 8px;
  }

  .meaning {
    font-size: 1em;
    align-items: center;
    padding: 0 8px;
  }

  .grouped-sense.anki .meaning:focus {
    border-left: 2px solid #ff6086;
    padding: 0 6px;
    background-color: rgba(0, 0, 0, 0.07);
  }

  .grouped-sense.anki .meaning:hover {
    background-color: rgba(0, 0, 0, 0.04);
  }

  .meaning:focus-visible {
    outline: none;
  }
</style>
