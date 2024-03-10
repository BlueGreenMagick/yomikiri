<script lang="ts">
  import { RubyString, containsJapaneseContent } from "~/japanese";
  import type { Token } from "@platform/backend";
  import RubyText from "../RubyText.svelte";

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

<div class="sentence-view">
  {#each tokens as token, idx}
    <div
      class="token"
      class:selected={idx == selectedTokenIdx}
      class:invalid={invalidTokens[idx]}
    >
      <a
        href={"#"}
        draggable="false"
        on:click={() => {
          if (!invalidTokens[idx]) {
            selectedCharAt = token.start;
          }
        }}
      >
        <RubyText text={RubyString.fromToken(token)} />
      </a>
    </div>
  {/each}
</div>

<style>
  .sentence-view {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    font-size: 1.5em;
  }

  .token {
    display: flex;
    margin: 2px;
    min-height: 1.6em;
    align-items: flex-end;
    user-select: none;
    -webkit-user-select: none;
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
