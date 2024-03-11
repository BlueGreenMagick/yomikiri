<script lang="ts">
  import { BrowserApi } from "~/extension/browserApi";
  import { type TranslateResult } from "@platform";
  import Utils from "~/utils";

  export let sentence: string;
  export let shown: boolean;
  export let translation: Promise<TranslateResult> | null = null;

  let display: string = "Translating...";
  // current sentence translation errored
  let failed: boolean = false;

  async function requestTranslation() {
    let [promise, resolver, rejector] = Utils.createPromise<TranslateResult>();
    translation = promise;
    display = "Translating...";

    try {
      let result = await BrowserApi.request("translate", sentence);
      display = result.translated;
      resolver(result);
    } catch (err) {
      failed = true;
      display = `Error occured: ${Utils.errorMessage(err)}`;
      rejector(err);
    }
  }

  function onShownChange(shown: boolean) {
    if (shown == false) return;
    if (translation == null || failed) {
      requestTranslation();
    }
  }

  async function onSentenceChange(sentence: string) {
    translation = null;
    failed = false;
    display = "";
  }

  $: onShownChange(shown);
  $: onSentenceChange(sentence);
</script>

<div class="translation-pane" class:shown>
  <div class="title">Translation</div>
  <div class="translation">
    {display}
  </div>
</div>

<style>
  .translation-pane {
    padding: var(--edge-horizontal-padding);
    display: none;
  }

  .translation-pane.shown {
    display: block;
  }

  .title {
    font-weight: bold;
  }

  .translation {
    margin-top: 8px;
  }
</style>
