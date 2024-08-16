<script lang="ts">
  import IconClose from "@icons/close.svg";

  export let onClose: () => void;

  export let title: string;
  export let hidden = false;
</script>

<div class="modal-container" class:hidden>
  <div class="modal">
    <div class="modal-header">
      <div class="modal-title">{title}</div>
      <button class="close-button" on:click={onClose}>
        <IconClose />
      </button>
    </div>
    <div class="modal-content"><slot /></div>
  </div>
  <div class="modal-background" />
</div>

<style>
  .modal-container {
    position: fixed;
    z-index: 99;
    top: 0;
    left: 0;
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100vw;
    height: 100vh;
  }

  .modal-container.hidden {
    display: none;
  }

  .modal-background {
    position: absolute;
    z-index: -1;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.3);
  }

  .modal {
    display: flex;
    flex-flow: column nowrap;
    width: 90%;
    height: 90%;
    max-width: 900px;
    border-radius: 8px;
    background-color: var(--background-alt);
  }

  .modal-header {
    margin: 12px;
    font-size: 1.5rem;
    display: flex;
    align-items: center;
  }
  .modal-content {
    flex: 1 1 auto;
    min-width: 0;
    overflow-y: auto;
    border-top: 1px solid var(--border);
  }

  .modal-title {
    flex: 1 1 auto;
    min-width: 0;
  }

  .close-button {
    flex: 0 0 auto;

    display: flex;
    justify-content: center;
    align-items: center;

    width: 18px;
    height: 18px;
    fill: black;
  }
</style>
