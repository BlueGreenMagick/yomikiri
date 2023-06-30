<script lang="ts">
  import DicEntriesView from "~/components/dictionary/DicEntriesView.svelte";
  import { Entry } from "~/dicEntry";

  // change this variable when config updates
  export let update = false;

  const entriesData: Entry[] = [
    {
      terms: ["読む", "讀む", "よむ"],
      forms: [
        {
          form: "読む",
          priority: ["ichi1", "news1", "nf12"],
        },
        {
          form: "讀む",
          info: ["=sK="],
        },
      ],
      readings: [
        {
          reading: "よむ",
          priority: ["ichi1", "news1", "nf12"],
        },
      ],
      sense: [
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
          reference: ["さばを読む"],
          info: ["now mostly used in idioms"],
          meaning: ["to count", "to estimate"],
        },
        {
          partOfSpeech: ["=v5m=", "=vt="],
          reference: ["訓む"],
          info: ["also written as 訓む"],
          meaning: ["to read (a kanji) with its native Japanese reading"],
        },
      ],
      id: 441534,
    },
  ].map(Entry.fromObject);
</script>

<div>
  <DicEntriesView entries={entriesData} />
</div>

<style>
  div {
    position: sticky;
    top: 40px;
    margin-top: 40px;
    max-height: 300px;
    overflow: hidden auto;
    background-color: white;
    will-change: transform;
  }
</style>
