<script lang="ts">
  import type Config from "~/config";
  import Modal from "../Modal.svelte";
  import LoadAnkiTemplate from "./LoadAnkiTemplate.svelte";
  import type {AnkiOptionsApi} from "@platform/anki"

  export let config: Config
  export let ankiApi: AnkiOptionsApi
</script>

<Modal title="Anki Template" on:close>
  <LoadAnkiTemplate {config} {ankiApi} />
</Modal>
