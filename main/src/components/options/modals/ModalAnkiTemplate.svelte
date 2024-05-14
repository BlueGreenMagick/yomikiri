<script lang="ts">
  import type { Platform } from "@platform";
  import type Config from "~/lib/config";
  import Modal from "../Modal.svelte";
  import LoadAnkiTemplate from "./LoadAnkiTemplate.svelte";
  import type { AnkiOptionsApi } from "@platform/anki";

  export let platform: Platform;
  export let config: Config;
  export let ankiApi: AnkiOptionsApi;
  export let onClose: () => void;
</script>

<Modal title="Anki Template" {onClose}>
  <LoadAnkiTemplate {platform} {config} {ankiApi} />
</Modal>
