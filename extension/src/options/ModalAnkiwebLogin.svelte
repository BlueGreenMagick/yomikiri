<script lang="ts">
  import AnkiApi from "@platform/anki";
  import Modal from "./components/Modal.svelte";
  import { createEventDispatcher } from "svelte";
  import Utils from "~/utils";

  export let hidden: boolean;
  export let username: string = "";

  const dispatch = createEventDispatcher<{ login: string }>();

  let newUsername: string;
  let password: string;
  let infoMessage: string = "";

  async function login() {
    try {
      if (!newUsername) {
        throw new Error("Email field is empty");
      }
      if (!password) {
        throw new Error("Password field is empty");
      }
      infoMessage = "Logging in...";
      await AnkiApi.login(newUsername, password);
      dispatch("login", newUsername);
    } catch (err) {
      console.error(err);
      let errorMsg;
      if (err instanceof Error) {
        errorMsg = `${err.name}: ${Utils.escapeHTML(err.message)}`;
      } else {
        errorMsg = "Unknown error: check the browser console for details";
      }
      infoMessage = `<span class='warning'>${errorMsg}</span>`;
    }
  }

  function onShown() {
    newUsername = username;
    password = "";
    infoMessage = "";
  }

  $: if (!hidden) onShown();
</script>

<Modal title="Ankiweb Log in" {hidden} on:close>
  <div class="container">
    <div class="label">Email:</div>
    <input class="input" type="text" bind:value={newUsername} />
    <div class="spacer" />
    <div class="label">Password:</div>
    <input class="input" type="password" bind:value={password} />
    <div class="message">{@html infoMessage}</div>
    <button type="button" on:click={login}>Log in</button>
  </div>
</Modal>

<style>
  .container {
    display: grid;
    grid-template-columns: auto 1fr;
    align-items: center;
    column-gap: 12px;
    row-gap: 4px;
  }
  .label {
    grid-column: 1 / 2;
    justify-self: end;
  }
  .input {
    grid-column: 2 / 3;
    display: block;
  }
  .spacer {
    grid-column: 1/3;
    height: 4px;
  }
  .message {
    grid-column: 2 / 3;
    font-size: 0.9em;
  }
  button {
    grid-column: 2 / 3;
    justify-self: start;
    padding: 6px 8px;
    justify-self: start;
    border: none;
    border-radius: 4px;
    min-width: 80px;
  }
</style>
