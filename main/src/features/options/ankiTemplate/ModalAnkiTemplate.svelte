<script lang="ts">
  import type { AppCtx, DesktopCtx, IosAppCtx } from "@/features/ctx";
  import Modal from "../Modal.svelte";
  import LoadAnkiTemplate from "./LoadAnkiTemplate.svelte";

  export let ctx: AppCtx<DesktopCtx | IosAppCtx>;
  export let onClose: () => void;
</script>

<div class="modal-anki-template">
  <Modal title="Anki Template" {onClose}>
    <LoadAnkiTemplate {ctx} />
  </Modal>
</div>
