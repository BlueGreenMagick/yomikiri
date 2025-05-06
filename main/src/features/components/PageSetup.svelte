<script>
  import { handleErrors, platformClass, setStyle } from "./actions";
</script>

<div use:platformClass use:setStyle use:handleErrors style="display: none;" />

<style global>
  @import "../../global.css";
</style>
