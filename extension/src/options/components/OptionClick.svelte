<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import { updateConfig } from "../stores";
  import OptionBase from "./OptionBase.svelte";

  export let title: string;
  export let description: string = "";
  export let buttonText: string;

  const dispatch = createEventDispatcher();

  function onKeyDown(ev: KeyboardEvent) {
    if (ev.key === "Enter" || ev.key === " ") {
      dispatch("trigger");
      updateConfig();
    }
  }
</script>

<div on:keydown={onKeyDown}>
  <OptionBase {title} {description}>
    <button
      on:click={() => {
        dispatch("trigger");
      }}>{buttonText}</button
    >
  </OptionBase>
</div>

<style>
  button {
    padding: 2px 8px;
    min-width: 120px;
    transition: background-color 0.125s ease-in-out;
  }
</style>
