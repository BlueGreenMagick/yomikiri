<script lang="ts">
  export let title: string;
  export let description: string = "";
</script>

<div class="option-item">
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

<style>
  .option-item {
    display: flex;
    justify-content: center;
    padding: 6px;
  }
  .left {
    flex: 1 0 auto;
  }
  .right {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
  }
  .title {
  }
  .description {
    color: gray;
  }
</style>
