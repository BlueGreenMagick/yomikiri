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
    border-bottom: 1px solid lightgray;
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
  }
  .right {
    flex: 0 1 auto;
    display: flex;
    align-items: center;
  }
  .right.wide {
    flex: 2 1 auto;
  }
  .title {
    margin: 1px 0px;
    font-size: 1em;
  }
  .description {
    color: gray;
    font-size: 0.8em;
  }
</style>
