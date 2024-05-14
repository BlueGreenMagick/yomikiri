<script lang="ts">
  import DicEntriesView from "../dictionary/DicEntriesView.svelte";
  import { Entry, type EntryObject } from "~/lib/dicEntry";
  import { Config } from "~/lib/config";
  import { onMount } from "svelte";
  import type { Platform } from "@platform";

  export let platform: Platform;
  export let config: Config;

  const entriesData: Entry[] = (
    [
      {
        terms: ["読む", "讀む", "よむ"],
        forms: [
          {
            form: "読む",
          },
          {
            form: "讀む",
            uncommon: true,
            info: ["=sK="],
          },
        ],
        readings: [
          {
            reading: "よむ",
          },
        ],
        senses: [
          {
            pos: ["=v5m=", "=vt="],
            meaning: ["to read"],
          },
          {
            pos: ["=v5m=", "=vt="],
            meaning: ["to recite (e.g. a sutra)", "to chant"],
          },
          {
            pos: ["=v5m=", "=vt="],
            meaning: [
              "to predict",
              "to guess",
              "to forecast",
              "to read (someone's thoughts)",
              "to see (e.g. into someone's heart)",
              "to divine",
            ],
          },
          {
            pos: ["=v5m=", "=vt="],
            meaning: ["to decipher"],
          },
          {
            pos: ["=v5m=", "=vt="],
            info: ["now mostly used in idioms"],
            meaning: ["to count", "to estimate"],
          },
          {
            pos: ["=v5m=", "=vt="],
            info: ["also written as 訓む"],
            meaning: ["to read (a kanji) with its native Japanese reading"],
          },
        ],
        priority: 163,
      },
    ] as EntryObject[]
  ).map(Entry.fromObject);

  let updateTick = 0;

  function update() {
    updateTick += 1;
  }

  onMount(() => {
    config.subscribe(update);

    return () => {
      config.removeSubscriber(update);
    };
  });
</script>

<div>
  {#key updateTick}
    <DicEntriesView {platform} {config} entries={entriesData} />
  {/key}
</div>

<style>
  div {
    position: sticky;
    top: 45px;
    margin-top: 40px;
    max-height: 300px;
    overflow: hidden auto;
    background-color: white;
    border-radius: 4px;
    will-change: transform;
  }
</style>
