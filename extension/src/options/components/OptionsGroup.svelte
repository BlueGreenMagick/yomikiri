<script lang="ts">
  export let title: string;
</script>

<div class="options-group">
  <div class="title">{title}</div>
  <div class="grouped">
    <slot />
  </div>
</div>

<style>
  .options-group {
    margin-top: 8px;
  }

  .title {
    font-size: 2em;
  }
  .grouped {
    margin-top: 8px;
    border-radius: 6px;

    font-size: 1.2em;

    background-color: white;
    box-shadow: 0 1px 4px gray;
  }
</style>
