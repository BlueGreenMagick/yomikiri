<script lang="ts">
  import OptionSelect from "components/options/items/OptionSelect.svelte";
  import type { AnyAnkiTemplateField } from "lib/anki";

  export let template: AnyAnkiTemplateField;
</script>

<div class="anki-template-field-options grouped">
  {#if template.type === "word"}
    <OptionSelect
      bind:selected={template.options.form}
      options={[
        ["as-is", "Form used in sentence"],
        ["dict-form", "Dictionary conjugation form (ーる）"],
        ["main-dict-form", "Main form used in dictionary"],
      ]}
      title="Form"
    >
      Which form of word to use.
    </OptionSelect>
  {/if}
  {#if template.type === "sentence"}
    <OptionSelect
      bind:selected={template.options.word}
      options={["none", "cloze", "bold", "span"]}
      title="Selected Word Style"
    >
      Style selected word within sentence
    </OptionSelect>
  {/if}
  {#if template.type === "word" || template.type === "sentence"}
    <OptionSelect
      bind:selected={template.options.style}
      options={["basic", "furigana-anki", "furigana-html", "kana-only"]}
      title="Style"
    >
      Whether to use furigana, or convert word to kana.<br />
      'furigana-anki' outputs
      <a href="https://docs.ankiweb.net/templates/fields.html#ruby-characters"
        >Anki-format furigana</a
      >.
    </OptionSelect>
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
