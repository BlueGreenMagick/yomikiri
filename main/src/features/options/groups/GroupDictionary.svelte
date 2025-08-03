<script lang="ts">
  import type { AppCtx, DesktopCtx, IosAppCtx } from "@/features/ctx";
  import { YomikiriError } from "@/features/error";
  import GroupedOptions from "../GroupedOptions.svelte";
  import OptionButton from "../items/OptionButton.svelte";

  type DictState =
    | "loading"
    | "loaded"
    | "downloading"
    | "downloaded"
    | "error";

  export let ctx: AppCtx<DesktopCtx | IosAppCtx>;

  let state: DictState = "loading";
  let dictDescription = "Loading...";

  async function initialize() {
    const metadata = await ctx.backend.getDictMetadata();
    const date = metadata.jmdict_creation_date ?? "Unknown date";
    dictDescription = `Dictionary created on: ${date}`;
    state = "loaded";
  }

  async function onClicked() {
    if (state !== "loaded") return;

    try {
      state = "downloading";
      const updating = ctx.backend.updateDictionary();
      updating.subscribe((progress) => {
        dictDescription = progress;
      });
      const updated = await updating.promise();
      if (updated) {
        dictDescription = "Successfully updated dictionary!";
      } else {
        dictDescription = "Dictionary is already up to date.";
      }

      state = "downloaded";
    } catch (e) {
      state = "error";
      const err = YomikiriError.from(e);
      dictDescription = "Error: " + err.message;
      throw err.context("Failed to update dictionary");
    }
  }

  void initialize();
</script>

<GroupedOptions title="Dictionary">
  <OptionButton
    title="Dictionary file"
    buttonText="Update"
    disabled={state === "loading"}
    buttonDisabled={state !== "loaded" && state !== "error"}
    {onClicked}
  >
    <span
      class:success={state === "downloaded"}
      class:loading={["loading", "downloading"].includes(state)}
    >
      {dictDescription}
    </span>
  </OptionButton>
</GroupedOptions>

<style>
  .loading {
    opacity: 0.8;
  }
</style>
