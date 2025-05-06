<script lang="ts">
  import { handleErrors, platformClass, setStyle } from "./actions";
  import type { AppContext } from "../context";

  export let ctx: AppContext;
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
