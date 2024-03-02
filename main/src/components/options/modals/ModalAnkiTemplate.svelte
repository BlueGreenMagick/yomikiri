<script lang="ts">
  import Modal from "../Modal.svelte";
  import LoadAnkiTemplate from "./LoadAnkiTemplate.svelte";
</script>

<Modal title="Anki Template" on:close>
  <LoadAnkiTemplate />
</Modal>
