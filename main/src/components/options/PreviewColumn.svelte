<script lang="ts">
  import DicEntriesView from "../dictionary/DicEntriesView.svelte";
  import { Entry } from "~/dicEntry";
  import { Config } from "~/config";
  import { onMount } from "svelte";

  const entriesData: Entry[] = [
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
          partOfSpeech: ["=v5m=", "=vt="],
          meaning: ["to read"],
        },
        {
          partOfSpeech: ["=v5m=", "=vt="],
          meaning: ["to recite (e.g. a sutra)", "to chant"],
        },
        {
          partOfSpeech: ["=v5m=", "=vt="],
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
          partOfSpeech: ["=v5m=", "=vt="],
          meaning: ["to decipher"],
        },
        {
          partOfSpeech: ["=v5m=", "=vt="],
          info: ["now mostly used in idioms"],
          meaning: ["to count", "to estimate"],
        },
        {
          partOfSpeech: ["=v5m=", "=vt="],
          info: ["also written as 訓む"],
          meaning: ["to read (a kanji) with its native Japanese reading"],
        },
      ],
      priority: 163,
    },
  ].map(Entry.fromObject);

  let updateTick: number = 0;

  function update() {
    updateTick += 1;
  }

  onMount(() => {
    Config.onChange(update);

    return () => {
      Config.removeOnChange(update);
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
