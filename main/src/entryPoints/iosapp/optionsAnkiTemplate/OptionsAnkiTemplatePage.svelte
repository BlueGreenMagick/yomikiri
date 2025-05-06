<script lang="ts">
  import { LoadAnkiTemplate } from "@/features/options";
  import Page from "@/features/components/Page.svelte";
</script>

<Page>
  <div id="main">
    <LoadAnkiTemplate />
  </div>
</Page>

<style global>
  @import "features/options/styles.css";

  #main {
    overflow-x: hidden;
  }
</style>
