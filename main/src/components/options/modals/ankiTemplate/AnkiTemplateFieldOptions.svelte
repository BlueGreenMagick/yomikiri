<script lang="ts">
  import Select from "components/Select.svelte";
  import OptionSelect from "components/options/items/OptionSelect.svelte";
  import type { AnyAnkiTemplateField } from "lib/anki";

  export let template: AnyAnkiTemplateField;
</script>

<div class="anki-template-field-options">
  {#if template.type === "word"}
    <OptionSelect
      bind:selected={template.options.form}
      options={["as-is", "dict-form", "main-dict-form"]}
      title="Form"
    >
      Word styling
    </OptionSelect>
  {/if}
  {#if template.type === "sentence"}
    <OptionSelect
      bind:selected={template.options.word}
      options={["none", "cloze", "bold", "span"]}
      title="Style selected word"
    >
      Word styling
    </OptionSelect>
  {/if}
  {#if template.type === "word" || template.type === "sentence"}
    <OptionSelect
      bind:selected={template.options.style}
      options={["basic", "furigana-anki", "furigana-html", "kana-only"]}
      title="Style"
    />
  {/if}
  {#if template.type === "" || template.type === "translated-sentence" || template.type === "url" || template.type === "link"}
    <div class="gray">No configurable options</div>
  {/if}
</div>

<style>
  .gray {
    color: var(--text-light);
  }
</style>
