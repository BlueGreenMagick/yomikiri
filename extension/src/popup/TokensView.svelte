<script lang="ts">
  import { RubyString, containsJapaneseContent } from "~/japanese";
  import type { Token } from "~/tokenizer";

  export let tokens: Token[];
  // may be bigger than entries.length
  export let selectedIdx: number = 0;

  let invalidTokens: boolean[];

  function invalidToken(token: Token) {
    return !containsJapaneseContent(token.text);
  }

  $: invalidTokens = tokens.map(invalidToken);
</script>

<div>
  {#each tokens as token, idx}
    <div
      class="token"
      class:selected={selectedIdx === idx}
      class:invalid={invalidTokens[idx]}
    >
      <a
        href={"#"}
        on:click={() => {
          if (!invalidTokens[idx]) {
            selectedIdx = idx;
          }
        }}
      >
        {@html RubyString.toHtml(RubyString.fromToken(token))}
      </a>
    </div>
  {/each}
</div>

<style>
  div {
    font-size: 1.2em;
  }
  .token {
    display: inline-block;
    margin: 2px;
  }
  .token.selected:not(.invalid) a {
    color: blue;
  }
  .token a {
    text-decoration: none;
    color: black;
  }
  .token:not(.invalid) a {
    cursor: pointer;
    border-bottom: 1px solid black;
  }
</style>
