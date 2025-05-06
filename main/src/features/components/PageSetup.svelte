<script lang="ts">
  import { handleErrors, platformClass, setStyle } from "./actions";
  import type { AppCtx } from "../ctx";

  export let ctx: AppCtx;
</script>

<div
  use:platformClass
  use:setStyle={ctx.config}
  use:handleErrors
  style="display: none;"
/>

<style global>
  @import "../../global.css";
</style>
