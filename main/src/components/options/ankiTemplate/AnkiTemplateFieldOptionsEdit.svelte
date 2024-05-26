<script lang="ts">
  import OptionNumber from "components/options/items/OptionNumber.svelte";
  import OptionSelect from "components/options/items/OptionSelect.svelte";
  import OptionToggle from "components/options/items/OptionToggle.svelte";
  import type { AnkiTemplateField } from "lib/anki";
  import IconAddCircleOutline from "@icons/add-circle-outline.svg";

  export let template: AnkiTemplateField;
</script>

<div class="anki-template-field-options-edit grouped">
  {#if template.content === "" || template.content === "translated-sentence" || template.content === "url" || template.content === "link"}
    <div class="gray">No configurable options</div>
  {/if}
  {#if template.content === "word"}
    <OptionSelect
      bind:selected={template.form}
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
  {#if template.content === "sentence"}
    <OptionSelect
      bind:selected={template.word}
      options={["none", "cloze", "bold", "span"]}
      title="Selected Word Style"
    >
      Style selected word within sentence
    </OptionSelect>
  {/if}
  {#if template.content === "word" || template.content === "sentence"}
    <OptionSelect
      bind:selected={template.style}
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
  {#if template.content === "meaning"}
    <div class="section-header">
      <h4>Full Entry</h4>
      <p>Below options apply if the whole dictionary entry is added to Anki.</p>
    </div>
    <OptionSelect
      bind:selected={template.full_format}
      options={[
        ["numbered", "Numbered list"],
        ["unnumbered", "Bulleted list"],
        ["line", "Single line"],
        ["div", "divs"],
        ["yomichan", "Yomichan style"],
      ]}
      title="Format"
    >
      How the meanings should be formatted.
    </OptionSelect>
    <OptionToggle bind:value={template.full_pos} title="Part of Speech">
      Include part of speech
    </OptionToggle>
    <OptionNumber
      bind:value={template.full_max_item}
      title="Max Items Per Meaning"
      min={0}
    >
      Use the first N glossaries per meaning. Use 0 to set no limit.
    </OptionNumber>

    <div class="section-header">
      <h4 class="second">Selected Meaning</h4>
      <p>
        When you select a meaning in the dictionary entry,
        <span class="hidden">'+' button</span><IconAddCircleOutline /> button turns
        orange.
        <br />
        Clicking
        <span class="orange-icon"
          ><span class="hidden">'+' button</span><IconAddCircleOutline /></span
        >
        will let you add only that meaning of the word to Anki.
        <br />
      </p>
      <p>Below options apply for such case.</p>
    </div>
    <OptionToggle bind:value={template.single_pos} title="Part of Speech">
      Include part of speech
    </OptionToggle>
    <OptionNumber
      bind:value={template.single_max_item}
      title="Max Items"
      min={0}
    >
      Use the first N glossaries. Use 0 to set no limit.
    </OptionNumber>
  {/if}
</div>

<style>
  .gray {
    color: var(--text-light);
  }

  h4 {
    margin-top: 1rem;
    margin-bottom: 0.25rem;
  }

  h4.second {
    margin-top: 2rem;
  }

  p {
    color: var(--text-light);
    margin: 0.25rem 0 0 0;
  }

  /* Have it show up when copied to clipboard */
  .hidden {
    font-size: 0;
  }

  p :global(svg) {
    display: inline;
    width: 1em;
    vertical-align: bottom;
  }

  .orange-icon :global(svg) {
    color: var(--accent);
  }

  .section-header {
    border-bottom: 1px solid var(--border);
    padding-bottom: 6px;
    margin: 0 8px;
  }
</style>
