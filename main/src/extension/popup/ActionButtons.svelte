<script lang="ts">
  import IconSettings from "@icons/settings.svg";
  import IconPower from "@icons/power.svg";
  import Config from "~/config";
  import type { Platform } from "@platform";

  export let platform: Platform
  export let config: Config


  let stateEnabled = config.get("state.enabled");

  function openSettings() {
    platform.openOptionsPage();
  }

  function toggleEnable() {
    let prevValue = config.get("state.enabled");
    stateEnabled = !prevValue;
    config.set("state.enabled", stateEnabled);
  }
</script>

<div class="action-buttons">
  <button
    class="icon-action"
    class:active={stateEnabled}
    on:click={toggleEnable}
    title={stateEnabled ? "Disable" : "Enable"}
  >
    <IconPower />
  </button>
  <button class="icon-action" on:click={openSettings} title="Open Settings">
    <IconSettings />
  </button>
</div>

<style>
  .icon-action {
    width: 36px;
    height: 36px;
    background-color: var(--button-bg);
    fill: white;
    border-radius: 4px;
    padding: 4px;
    transition: background-color 0.25s;
  }

  :global(html.ios) .icon-action {
    width: 48px;
    height: 48px;
  }

  .icon-action.active {
    background-color: var(--accent-orange);
  }

  :global(html.desktop) .icon-action:hover,
  :global(html.desktop) .icon-action:focus,
  .icon-action:active {
    filter: brightness(0.9);
    cursor: pointer;
  }

  .action-buttons {
    margin-top: 48px;
    width: 100%;

    display: flex;
    gap: 8px;
    flex-direction: row;
    justify-content: center;
  }

  :global(html.ios) .action-buttons {
    margin-top: 80px;
  }
</style>
