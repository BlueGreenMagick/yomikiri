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
      <button class="close-button" on:click={onClose}
        ><div class="icon-close"><IconClose /></div></button
      >
    </div>
    <div class="modal-content"><slot /></div>
  </div>
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
    background-color: rgba(0, 0, 0, 0.3);
  }

  .modal-container.hidden {
    display: none;
  }

  .modal {
    display: flex;
    flex-flow: column nowrap;
    width: 600px;
    height: 400px;
    max-width: 90%;
    max-height: 90%;
    border-radius: 8px;
    background-color: white;
  }

  .modal-header {
    margin: 12px;
    font-size: 1.5em;
    display: flex;
    align-items: center;
  }
  .modal-content {
    flex: 1 1 auto;
    overflow-y: auto;
    border-top: 1px solid lightgray;
  }

  .modal-title {
    flex: 1 1 auto;
  }

  .close-button {
    flex: 0 0 auto;
    padding: 6px 18px;

    display: flex;
    justify-content: center;
    align-items: center;

    border: 1px solid black;
    border-radius: 3px;
    background-color: var(--background-alt);
  }

  .close-button:focus-visible {
    border: 1px solid transparent;
  }

  .icon-close {
    width: 18px;
    height: 18px;
    fill: black;
  }
</style>
