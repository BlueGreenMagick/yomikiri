<script lang="ts">
  import type { AppContext } from "@/features/context";
  import Modal from "../Modal.svelte";
  import LoadAnkiTemplate from "./LoadAnkiTemplate.svelte";

  export let ctx: AppContext;
  export let onClose: () => void;
</script>

<div class="modal-anki-template">
  <Modal title="Anki Template" {onClose}>
    <LoadAnkiTemplate {ctx} />
  </Modal>
</div>
