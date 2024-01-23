<script lang="ts">
  import { RubyString, containsJapaneseContent } from "~/japanese";
  import type { Token } from "@platform/backend";

  export let tokens: Token[];
  // may be bigger than total token character
  export let selectedCharAt: number = 0;

  let selectedTokenIdx: number = 0;
  let invalidTokens: boolean[];

  function invalidToken(token: Token) {
    return !containsJapaneseContent(token.text);
  }

  function updateSelectedToken(tokens: Token[], selectedCharAt: number) {
    for (let i = 0; i < tokens.length; i++) {
      if (tokens[i].start > selectedCharAt) {
        selectedTokenIdx = i - 1;
        return;
      }
    }
    selectedTokenIdx = tokens.length - 1;
  }

  $: invalidTokens = tokens.map(invalidToken);
  $: updateSelectedToken(tokens, selectedCharAt);
</script>

<div>
  {#each tokens as token, idx}
    <div
      class="token"
      class:selected={idx == selectedTokenIdx}
      class:invalid={invalidTokens[idx]}
    >
      <a
        href={"#"}
        on:click={() => {
          if (!invalidTokens[idx]) {
            selectedCharAt = token.start;
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
    color: var(--accent);
  }
  .token a {
    text-decoration: none;
    color: var(--text);
  }

  .token.invalid a {
    cursor: default;
  }
  .token:not(.invalid) a {
    cursor: pointer;
    border-bottom: 1px solid var(--text);
  }
  .token.selected:not(.invalid) a {
    border-bottom: 1px solid var(--accent);
  }
</style>
