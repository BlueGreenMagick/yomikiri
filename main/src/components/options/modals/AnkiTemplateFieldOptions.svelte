<script lang="ts">
  import Select from "components/Select.svelte";
  import type { AnyFieldTemplate } from "lib/anki";

  export let template: AnyFieldTemplate;
</script>

<div class="anki-template-field-options">
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
  {#if template.type === "" || template.type === "translated-sentence" || template.type === "url" || template.type === "link"}
    <div class="gray">No configurable options</div>
  {/if}
</div>

<style>
  .row {
    display: flex;
    align-items: center;
    margin: 8px 0;
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

  .gray {
    color: var(--text-light);
  }
</style>
