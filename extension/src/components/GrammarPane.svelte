<script lang="ts">
  import type { GrammarInfo } from "@yomikiri/yomikiri-rs";

  export let grammars: GrammarInfo[];
</script>

<div class="grammar-pane">
  <div class="title">Grammar</div>
  <div class="grammars">
    {#each grammars as grammar}
      <div class="grammar">
        <div class="name">{grammar.name}:</div>
        <div class="short">{grammar.short}</div>
        <div class="tofugu"><a href={grammar.tofugu}>tofugu</a></div>
      </div>
    {/each}
  </div>
</div>

<style>
  .grammar-pane {
    padding: var(--edge-horizontal-padding);
    background-color: var(--background-alt);
  }

  .title {
    font-weight: bold;
  }

  .grammars {
    margin-top: 12px;
  }

  .grammar {
    margin-top: 6px;
    display: flex;
    gap: 6px;
  }

  .name {
    font-family: var(--japanese-font-family);
  }

  .short {
    flex: 1 1 auto;
  }

  .tofugu {
    font-size: 0.8em;
  }
</style>
