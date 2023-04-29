<script lang="ts">
  import IconClose from "@icons/close.svg";
</script>

<button on:click><span class="icon">{@html IconClose}</span></button>

<style>
  button {
    width: var(--close-button-width);
    height: var(--header-height);
    padding: 2px;

    display: flex;
    justify-content: center;
    align-items: center;

    position: absolute;
    right: 0;
    top: 0;
    z-index: 10;
  }

  .icon {
    display: inline-block;
    width: 24px;
    height: 24px;
  }
</style>
