<script lang="ts">
  import Select from "components/Select.svelte";
  import type { AnyFieldTemplate } from "lib/anki";

  export let template: AnyFieldTemplate;
</script>

<div>
  {#if template.type === "word" || template.type === "dict-form" || template.type === "sentence"}
    <div class="row">
      <div>Form:</div>
      <div>
        <Select
          selected={template.options.form}
          options={["default", "kanji", "kana"]}
        />
      </div>
    </div>
  {/if}
  {#if template.type === "word" || template.type === "dict-form" || template.type === "main-dict-form" || template.type === "sentence"}
    <div class="row">
      <div>Furigana:</div>
      <div>
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
  }
</style>
