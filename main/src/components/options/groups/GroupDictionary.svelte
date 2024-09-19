<script lang="ts">
  import GroupedOptions from "../GroupedOptions.svelte";
  import OptionButton from "../items/OptionButton.svelte";
  import {
    Backend as PlatformBackend,
    type DesktopBackend,
    type IosAppBackend,
  } from "@platform/backend";
  import { YomikiriError } from "lib/error";

  type DictState =
    | "loading"
    | "loaded"
    | "downloading"
    | "downloaded"
    | "error";

  const Backend = PlatformBackend as
    | typeof DesktopBackend
    | typeof IosAppBackend;

  let state: DictState = "loading";
  let dictDescription = "Loading...";

  async function initialize() {
    const metadata = await Backend.getDictMetadata();
    const date = metadata.jmdict_creation_date ?? "Unknown date";
    dictDescription = `Dictionary created on: ${date}`;
    state = "loaded";
  }

  async function onClicked() {
    if (state !== "loaded") return;

    try {
      state = "downloading";
      const updating = Backend.updateDictionary();
      updating.progress.subscribe((value) => {
        dictDescription = value;
      });
      const updated = await updating;
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
