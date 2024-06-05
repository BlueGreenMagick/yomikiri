<!--
  @component
  Field for Anki Note Preview

  Field content is edited as HTML escaped content:
  '&' is replaced with '&amp;' during edit,
  which is replaced back to '&' when saving to field.value

  This component should be re-created for new `field` object.
-->
<script lang="ts">
  import type { LoadingField } from "lib/anki";
  import {
    PromiseWithProgress,
    getErrorMessage,
    isAppleDevice,
  } from "lib/utils";
  import { onMount } from "svelte";
  import type { Unsubscriber } from "svelte/store";

  export let field: LoadingField;
  export let errored = false;
  export let readonly = false;

  let loading = false;
  let initialContent: string | null = null;
  let element: HTMLDivElement | null = null;
  let unsubscriber: Unsubscriber | null = null;

  function initialize() {
    errored = false;
    const value = field.value;

    if (value instanceof PromiseWithProgress) {
      loading = true;
      unsubscriber = value.progress.subscribe((val) => {
        initialContent = val;
      });
      value
        .then((v) => {
          field.value = v;
        })
        .catch((err: unknown) => {
          errored = true;
          initialContent = getErrorMessage(err);
        })
        .finally(() => {
          loading = false;
          unsubscribe();
        });
    } else {
      loading = false;
      initialContent = value;
    }
  }

  function unsubscribe() {
    if (unsubscriber !== null) {
      unsubscriber();
      unsubscriber = null;
    }
  }

  function onFocus() {
    if (errored) {
      initialContent = "";
      field.value = "";
      errored = false;
    }
  }

  function onInput(ev: Event) {
    const elem = ev.currentTarget as HTMLDivElement;
    console.log("input", elem.textContent);
    field.value = elem.textContent ?? "";
  }

  function wrapSelection(prefix: string, postfix: string) {
    if (element === null) return;

    const sel = element.ownerDocument.getSelection();
    if (sel === null) return;

    const range = sel.getRangeAt(0);
    const startNode = range.startContainer;
    const endNode = range.endContainer;

    if (range.collapsed) return;
    if (!element.contains(startNode)) return;
    if (!element.contains(endNode)) return;

    const text = range.cloneContents().textContent;
    if (text === null) return;

    element.ownerDocument.execCommand(
      "inserttext",
      false,
      prefix + text + postfix,
    );
  }

  function onKeyDown(ev: KeyboardEvent) {
    const lowerKey = ev.key.toLowerCase();
    // use 'cmd' key on mac / ipad
    const ctrlKey = isAppleDevice() ? ev.metaKey : ev.ctrlKey;

    // input should display raw html
    if (ctrlKey && lowerKey === "i") {
      ev.preventDefault();
      wrapSelection("<i>", "</i>");
    }
    if (ctrlKey && lowerKey === "b") {
      console.log("boldening");
      ev.preventDefault();
      wrapSelection("<b>", "</b>");
    }
    if (ctrlKey && lowerKey === "u") {
      ev.preventDefault();
      wrapSelection("<u>", "</u>");
    }
  }

  function onContentInitialized() {
    if (element === null || initialContent === null) return;

    element.textContent = initialContent;
  }

  onMount(() => {
    return () => {
      unsubscribe();
    };
  });

  initialize();
  $: element, initialContent, onContentInitialized();
</script>

<div
  class="field-value"
  class:errored
  class:readonly
  class:loading
  on:keydown={onKeyDown}
  on:input={onInput}
  contenteditable={!readonly && !loading}
  on:focus={onFocus}
  bind:this={element}
/>

<style>
  .field-value {
    width: 100%;
    max-height: 5em;
    overflow-y: auto;
    border: 1px solid black;
    background-color: var(--background);
    padding: 2px;
    white-space: pre-wrap;
    word-break: break-all;
  }

  .field-value.loading {
    background-color: var(--background-alt);
    color: var(--text-light);
  }

  .field-value.errored {
    border: 1px solid var(--text-warn);
    color: var(--text-warn);
  }

  .field-value.readonly {
    opacity: 0.8;
    background-color: var(--background-alt);
  }

  /* Prevent non-contenteditable empty div from collapsing */
  .field-value[contenteditable="false"]:empty:before {
    content: "\00a0";
  }
</style>
