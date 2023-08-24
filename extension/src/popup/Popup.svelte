<script lang="ts">
  import Search from "./Search.svelte";
  import { platformClass } from "~/components/actions";
</script>

<div class="container" use:platformClass>
  <Search />
</div>

<style>
  .container {
    height: 100%;
    min-height: 200px;
    min-width: 300px;
    margin: 0 auto;
    padding: 0;
  }
</style>
