<script lang="ts">
  import type { AppCtx } from "../ctx";
  import { handleErrors, platformClass, setStyle } from "./actions";

  export let ctx: AppCtx;
</script>

<div
  use:platformClass={ctx}
  use:setStyle={ctx}
  use:handleErrors={ctx}
  style="display: none"
/>

<style global>
  @import "../../global.css";
</style>
