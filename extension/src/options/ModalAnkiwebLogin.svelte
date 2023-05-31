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
  let errorMsg: string = "";

  async function login() {
    try {
      await AnkiApi.login(newUsername, password);
      dispatch("login", newUsername);
    } catch (err) {
      console.error(err);
      if (err instanceof Error) {
        errorMsg = Utils.escapeHTML(err.message);
      } else if (typeof err === "string") {
        errorMsg = Utils.escapeHTML(err);
      } else {
        errorMsg = "Unknown error. Check the browser console for details.";
      }
    }
  }

  function onShown() {
    newUsername = username;
    password = "";
  }

  $: if (!hidden) onShown();
</script>

<Modal title="Ankiweb Log in" {hidden}>
  <div>
    <div class="row">
      <span>Email:</span>
      <input type="text" bind:value={newUsername} />
    </div>
    <div class="row">
      <span>Password:</span>
      <input type="password" bind:value={password} />
    </div>
    <div class="errorMsg">{errorMsg}</div>
    <button type="button" on:click={login}>Log in</button>
  </div>
</Modal>

<style>
  .errorMsg {
    color: red;
  }
</style>
