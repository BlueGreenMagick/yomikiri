<script lang="ts">
  import { createEventDispatcher } from "svelte";

  const dispatch = createEventDispatcher();

  export let title: string;
  export let hidden: boolean = false;
</script>

<div class="modal-container" class:hidden>
  <div class="modal">
    <div class="modal-header">{title}</div>
    <div class="modal-content"><slot /></div>
    <div class="modal-footer">
      <button
        on:click={() => {
          dispatch("close");
        }}>Close</button
      >
    </div>
  </div>
</div>

<style>
  .modal-container {
    position: fixed;
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
    padding: 12px;
    display: flex;
    flex-flow: column nowrap;
    width: 600px;
    height: 400px;
    max-width: 80%;
    max-height: 80%;
    border-radius: 8px;
    background-color: white;
  }

  .modal-header {
    font-size: 20px;
  }
  .modal-content {
    margin: 24px 0;
    flex: 1 1 auto;
    overflow-y: auto;
  }
  .modal-footer {
    height: 24px;
    display: flex;
    justify-content: flex-end;
  }

  button {
    background-color: blue;
  }
</style>
