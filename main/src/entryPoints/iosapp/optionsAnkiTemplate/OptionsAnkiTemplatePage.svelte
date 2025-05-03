<script lang="ts">
  import { LoadAnkiTemplate } from "@/components/options";
  import Page from "@/features/components/Page.svelte";
</script>

<Page>
  <div id="main">
    <LoadAnkiTemplate />
  </div>
</Page>

<style global>
  @import "../../../components/options/styles.css";

  #main {
    overflow-x: hidden;
  }
</style>
