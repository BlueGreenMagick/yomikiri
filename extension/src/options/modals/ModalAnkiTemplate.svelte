<script lang="ts">
  import Modal from "../components/Modal.svelte";
  import AnkiTemplate from "./AnkiTemplate.svelte";
  import LoadAnkiTemplate from "./LoadAnkiTemplate.svelte";
</script>

<Modal title="Anki Template" on:close>
  <LoadAnkiTemplate />
</Modal>
