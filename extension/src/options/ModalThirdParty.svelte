<script lang="ts">
  import Modal from "./components/Modal.svelte";
  import licensesDisclaimer from "@yomikiri/generate-license/res/THIRD_PARTY.txt";
</script>

<Modal title="Third Party Licenses" on:close>
  <div class="licenses">
    {licensesDisclaimer}
  </div>
</Modal>

<style>
  .licenses {
    overflow-y: visible;
    white-space: pre-wrap;
    margin: 0 8px;
  }
</style>
