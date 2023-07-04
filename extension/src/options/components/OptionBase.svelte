<script lang="ts">
  export let title: string;
  export let description: string = "";
</script>

<div class="option-item">
  <div class="inner">
    <div class="left">
      <div class="title">{@html title}</div>
      {#if description}
        <div class="description">{@html description}</div>
      {/if}
    </div>
    <div class="right">
      <slot />
    </div>
  </div>
</div>

<style>
  .option-item {
    margin: 0px 8px;
  }
  .inner {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 6px 0px;
    border-bottom: 1px solid lightgray;
  }
  :global(.grouped > div:last-child) .inner {
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
  .title {
    margin: 1px 0px;
    font-size: 1em;
  }
  .description {
    color: gray;
    font-size: 0.8em;
  }
</style>
