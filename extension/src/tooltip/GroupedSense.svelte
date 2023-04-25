<script lang="ts">
  import type { Sense, GroupedSense } from "../dictionary";

  export let group: GroupedSense;
</script>

<div>
  <div>
    {#each group[0] as pos}{pos}, {/each}
  </div>
  <div>
    {#each group[1] as sense, i}
      <div>
        {i + 1}, {#each sense.meaning as meaning}{meaning}, {/each}
      </div>
    {/each}
  </div>
</div>
