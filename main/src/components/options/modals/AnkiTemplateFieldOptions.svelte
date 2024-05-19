<script lang="ts">
  import Select from "components/Select.svelte";
  import type { AnyAnkiTemplateField } from "lib/anki";

  export let template: AnyAnkiTemplateField;
</script>

<div class="anki-template-field-options">
  {#if template.type === "word"}
    <div class="row">
      <div class="label">Form</div>
      <div class="option">
        <Select
          selected={template.options.form}
          options={["as-is", "dict-form", "main-dict-form"]}
        />
      </div>
    </div>
  {/if}
  {#if template.type === "sentence"}
    <div class="row">
      <div class="label">Style selected word</div>
      <div class="option">
        <Select
          selected={template.options.word}
          options={["none", "cloze", "bold", "span"]}
        />
      </div>
    </div>
  {/if}
  {#if template.type === "word" || template.type === "sentence"}
    <div class="row">
      <div class="label">Style</div>
      <div class="option">
        <Select
          selected={template.options.style}
          options={["basic", "furigana-anki", "furigana-html", "kana-only"]}
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
