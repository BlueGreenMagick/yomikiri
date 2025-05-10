<script lang="ts">
  export let count: number;
  export let onCancel: () => void;
</script>

{count} notes deleted.&nbsp;
<button
  on:click={() => {
    onCancel();
  }}
>
  Cancel
</button>

<style>
  button {
    display: inline-block;
    background: none;
    border: none;
    padding: 0;
    color: #069;
    text-decoration: underline;
    cursor: pointer;
  }
</style>
