<script lang="ts">
  import Modal from "../Modal.svelte";
  import licensesDisclaimer from "@yomikiri/generated/license/THIRD_PARTY.txt";

  export let onClose: () => void;
</script>

<Modal title="Third Party Licenses" {onClose}>
  <div class="licenses">
    <div class="jmdict">
      <h3>Dictionary Files</h3>
      <div>
        Yomikiri uses JMDict/JMneDict dictionary files for JP-EN dictionary.
      </div>
      <br />
      <div>
        The JMDict/JMneDict dictionary files are the property of the
        <a href="https://www.edrdg.org/"
          >Electronic Dictionary Research and Development Group</a
        >, and are used in conformance with the Group's
        <a href="https://www.edrdg.org/edrdg/licence.html">license</a>.
      </div>
    </div>
    <h3>Others</h3>
    <div class="other">
      {licensesDisclaimer}
    </div>
  </div>
</Modal>

<style>
  .licenses {
    overflow-y: visible;
    margin: 0 8px;
  }

  .jmdict {
    margin: 12px 0;
  }

  .other {
    white-space: pre-wrap;
  }
</style>
