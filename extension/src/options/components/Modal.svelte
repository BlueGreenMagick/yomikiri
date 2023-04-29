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
    padding: 12px 12px 16px 12px;
    font-size: 20px;
  }
  .modal-content {
    padding: 8px 12px;
    flex: 1 1 auto;
    overflow-y: auto;
    border-top: 1px solid lightgray;
    border-bottom: 1px solid lightgray;
  }
  .modal-footer {
    display: flex;
    justify-content: flex-end;
    padding: 8px;
  }

  button {
    border: none;
    border-radius: 4px;
    padding: 6px 8px;
    background-color: #3d4dff;
    color: white;
  }

  button:hover {
    background-color: #4f5efe;
    cursor: pointer;
  }

  button:active {
    background-color: #6e7aff;
    cursor: pointer;
  }
</style>
