<script lang="ts">
  import Select from "components/Select.svelte";
  import type { AnyFieldTemplate } from "lib/anki";

  export let template: AnyFieldTemplate;
</script>

<div class="anki-template-field-options">
  <div class="title">Options</div>
  {#if template.type === "word" || template.type === "dict-form" || template.type === "sentence"}
    <div class="row">
      <div class="label">Form</div>
      <div class="option">
        <Select
          selected={template.options.form}
          options={["default", "kanji", "kana"]}
        />
      </div>
    </div>
  {/if}
  {#if template.type === "word" || template.type === "dict-form" || template.type === "main-dict-form" || template.type === "sentence"}
    <div class="row">
      <div class="label">Furigana</div>
      <div class="option">
        <Select
          selected={template.options.furigana}
          options={["none", "furigana-anki", "furigana-html"]}
        />
      </div>
    </div>
  {/if}
</div>

<style>
  .row {
    display: flex;
    align-items: center;
    margin: 8px 0;
  }

  .title {
    font-weight: bold;
    margin-bottom: 8px;
    color: var(--text-light);
  }

  .label {
    flex: 1 1 0;
  }

  .option {
    flex: 1 1 0;
  }

  .option :global(select) {
    width: 100%;
  }
</style>
