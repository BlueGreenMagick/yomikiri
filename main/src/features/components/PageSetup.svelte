<script lang="ts">
  import { handleErrors, platformClass, setStyle } from "./actions";
  import type { AppCtx } from "../ctx";

  export let ctx: AppCtx;
</script>

<div
  use:platformClass={ctx}
  use:setStyle={ctx}
  use:handleErrors
  style="display: none;"
/>

<style global>
  @import "../../global.css";
</style>
