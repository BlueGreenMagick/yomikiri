<script lang="ts">
  import type { GrammarInfo } from "@yomikiri/backend-bindings";

  export let grammars: GrammarInfo[];
  export let shown: boolean;
</script>

<div class="grammar-pane" class:shown>
  <div class="title">Grammar</div>
  <div class="grammars">
    {#each grammars as grammar (grammar)}
      <div class="grammar">
        <div class="name Japanese">{grammar.name}:</div>
        <div class="short">{grammar.short}</div>
        <div class="tofugu">
          <a href={grammar.tofugu} target="_blank" rel="noopener">Tofugu</a>
        </div>
      </div>
    {/each}
  </div>
</div>

<style>
  .grammar-pane {
    padding: var(--edge-horizontal-padding);
    display: none;
  }

  .grammar-pane.shown {
    display: block;
  }

  .title {
    font-weight: bold;
  }

  .grammars {
    margin-top: 8px;
  }

  .grammar {
    margin-top: 6px;
    display: flex;
    gap: 6px;
  }

  .short {
    flex: 1 1 auto;
    min-width: 0;
  }

  .tofugu {
    font-size: 0.8rem;
  }
</style>
