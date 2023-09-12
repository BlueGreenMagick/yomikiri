<script lang="ts">
  import type { Entry } from "~/dicEntry";
  import DicEntriesView from "~/components/DicEntriesView.svelte";
  import { platformClass } from "~/components/actions";

  let entries: Entry[];

  export function setEntries(e: Entry[]) {
    entries = e;
  }
</script>

<div use:platformClass>
  <DicEntriesView {entries} on:addNote />
</div>

<style global>
  @import "../global.css";
</style>
