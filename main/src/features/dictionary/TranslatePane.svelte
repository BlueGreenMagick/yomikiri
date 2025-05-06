<script lang="ts">
  import type { TranslateResult } from "#platform";
  import Utils from "@/features/utils";
  import type { AppCtx } from "../ctx";

  export let ctx: AppCtx;
  export let sentence: string;
  export let shown: boolean;
  export let translation: Promise<TranslateResult> | null = null;

  let display = "Translating...";
  // current sentence translation errored
  let failed = false;

  async function requestTranslation() {
    let [promise, resolver, rejector] = Utils.createPromise<TranslateResult>();
    translation = promise;
    display = "Translating...";

    try {
      let result = await ctx.platform.translate(sentence);
      display = result.translated;
      resolver(result);
    } catch (err) {
      failed = true;
      display = `Error occured: ${Utils.getErrorMessage(err)}`;
      rejector(err);
    }
  }

  async function onShownChange(shown: boolean) {
    if (!shown) return;
    if (translation == null || failed) {
      await requestTranslation();
    }
  }

  function onSentenceChange(_sentence: string) {
    translation = null;
    failed = false;
    display = "";
  }

  $: void onShownChange(shown);
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
