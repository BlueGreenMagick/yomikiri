<script lang="ts">
  import DicEntriesView from "../dictionary/DicEntriesView.svelte";
  import { Entry, type EntryObject } from "lib/dicEntry";
  import { Config } from "lib/config";
  import { onMount } from "svelte";

  const config = Config.using();

  const entriesData: Entry[] = (
    [
      {
        terms: ["読む", "讀む", "訓む", "よむ"],
        forms: [
          {
            form: "読む",
            uncommon: false,
          },
          {
            form: "讀む",
            uncommon: true,
            info: ["=sK="],
          },
          {
            form: "訓む",
            uncommon: true,
            info: ["=sK="],
          },
        ],
        readings: [
          {
            reading: "よむ",
            nokanji: false,
            uncommon: false,
          },
        ],
        senses: [
          {
            pos: ["verb"],
            meaning: ["to read"],
          },
          {
            pos: ["verb"],
            meaning: ["to recite (e.g. a sutra)", "to chant"],
          },
          {
            pos: ["verb"],
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
            pos: ["verb"],
            meaning: ["to pronounce", "to read (e.g. a kanji)"],
          },
          {
            pos: ["verb"],
            meaning: [
              "to decipher",
              "to read (a meter, graph, music, etc.)",
              "to tell (the time)",
            ],
          },
          {
            pos: ["verb"],
            info: ["now mostly used in idioms"],
            meaning: ["to count", "to estimate"],
          },
          {
            pos: ["verb"],
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
    const configSubscriber = config.subscribe(update);

    return () => {
      configSubscriber.dispose();
    };
  });
</script>

<div>
  {#key updateTick}
    <DicEntriesView entries={entriesData} />
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
