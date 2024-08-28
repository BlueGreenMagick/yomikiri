<script lang="ts">
  import Modal from "../Modal.svelte";
  import LoadAnkiTemplate from "./LoadAnkiTemplate.svelte";
  import type { AnkiOptionsApi } from "@platform/anki";

  export let ankiApi: AnkiOptionsApi;
  export let onClose: () => void;
</script>

<div class="modal-anki-template">
  <Modal title="Anki Template" {onClose}>
    <LoadAnkiTemplate {ankiApi} />
  </Modal>
</div>
