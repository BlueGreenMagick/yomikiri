<script lang="ts">
  import type Config from "lib/config";
  import Modal from "../Modal.svelte";
  import LoadAnkiTemplate from "./LoadAnkiTemplate.svelte";
  import type { AnkiOptionsApi } from "@platform/anki";

  export let config: Config;
  export let ankiApi: AnkiOptionsApi;
  export let onClose: () => void;
</script>

<div class="modal-anki-template">
  <Modal title="Anki Template" {onClose}>
    <LoadAnkiTemplate {config} {ankiApi} />
  </Modal>
</div>
