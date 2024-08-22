<script lang="ts">
  import GroupedOptions from "../GroupedOptions.svelte";
  import OptionButton from "../items/OptionButton.svelte";
  import {
    Backend,
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

  let state: DictState = "loading";
  let dictDescription = "Loading...";

  async function initialize() {
    const backend = (await Backend.instance.get()) as
      | DesktopBackend
      | IosAppBackend;
    const date = await backend.getDictCreationDate();
    dictDescription = `Dictionary created on: ${date}`;
    state = "loaded";
  }

  async function onClicked() {
    if (state !== "loaded") return;

    try {
      state = "downloading";
      const backend = (await Backend.instance.get()) as
        | DesktopBackend
        | IosAppBackend;
      const updating = backend.updateDictionary();
      updating.progress.subscribe((value) => {
        dictDescription = value;
      });
      const _dictionaryMetadata = await updating;
      dictDescription = "Successfully updated dictionary!";
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
