<script lang="ts">
  export let title: string;
  export let disabled = false;
  export let wide = false;
</script>

<div class="option-item" class:disabled>
  <div class="left">
    <div class="title">{title}</div>
    <div class="description"><slot name="description" /></div>
  </div>
  <div class="right" class:wide>
    <slot />
  </div>
</div>

<style>
  .option-item {
    margin: 0px 8px;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 6px 0px;
    border-bottom: 1px solid var(--border);
    min-height: 2.5em;
  }
  .option-item.disabled .left {
    opacity: 0.6;
  }
  :global(.grouped > div:last-child) .option-item {
    border-bottom: none;
  }
  .left {
    flex: 1 1 auto;
    min-width: 0;
  }
  .right {
    flex: 0 0 auto;
    min-width: 0;
    display: flex;
    align-items: center;
  }
  .right.wide {
    flex: 2 0 auto;
    min-width: 0;
  }
  .title {
    margin: 1px 0px;
    font-size: 1.125rem;
  }
  .description {
    color: var(--text-light);
    font-size: 1rem;
  }
</style>
