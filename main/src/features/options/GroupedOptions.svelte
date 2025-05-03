<script lang="ts">
  export let title: string;
</script>

<div class="grouped-options">
  <div class="title">{title}</div>
  <div class="grouped">
    <slot />
  </div>
</div>

<style>
  .grouped-options {
    margin-top: 24px;
  }

  .grouped-options:first-child {
    margin-top: 0px;
  }

  .title {
    font-size: 1.6rem;
  }
  .grouped {
    margin-top: 8px;
    border-radius: 8px;
    background-color: white;
  }
</style>
