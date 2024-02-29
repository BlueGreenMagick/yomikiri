<script lang="ts">
  import { BrowserApi } from "~/browserApi";
  import Utils from "~/utils";

  export let sentence: string;
  export let shown: boolean;

  // @ts-ignore
  export let translation: Promise<string> = undefined;
  let resolveTranslation: Utils.PromiseResolver<string>;
  let rejectTranslation: Utils.PromiseRejector;

  [translation, resolveTranslation, rejectTranslation] =
    Utils.createPromise<string>();

  async function onShown(_shown: boolean) {
    if (_shown == false) return;
    BrowserApi.request("translate", sentence)
      .then((result) => {
        resolveTranslation(result.translated);
      })
      .catch(rejectTranslation);
  }

  translation.catch((e) => {
    console.log(e);
    throw e;
  });

  $: onShown(shown);
</script>

<div class="translation-pane" class:shown>
  <div class="title">Translation</div>
  <div class="translation">
    {#await translation}
      Translating...
    {:then translated}
      {translated}
    {:catch error}
      Error occured: {error}
    {/await}
  </div>
</div>

<style>
  .translation-pane {
    padding: var(--edge-horizontal-padding);
    background-color: var(--background-alt);
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
