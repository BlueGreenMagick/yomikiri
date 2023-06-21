<script lang="ts">
  import { RubyString } from "~/japanese";
  import type { Token } from "~/tokenizer";

  export let tokens: Token[];
  export let selectedIdx: number = 0;
</script>

<div>
  {#each tokens as token, idx}
    <div class="token" class:selected={selectedIdx === idx}>
      <a
        href={"#"}
        on:click={() => {
          selectedIdx = idx;
        }}
      >
        {@html RubyString.toHtml(RubyString.fromToken(token))}
      </a>
    </div>
  {/each}
</div>

<style>
  div {
    font-size: 16px;
  }
  .token {
    display: inline-block;
    margin: 2px;
  }
  .token.selected a {
    color: blue;
  }
  .token a {
    text-decoration: none;
    cursor: pointer;
    border-bottom: 1px solid black;
    color: black;
  }
</style>
