<script lang="ts">
  import { PagePlatform } from "@platform";
  import GroupedOptions from "../GroupedOptions.svelte";
  import OptionButton from "../items/OptionButton.svelte";
  import Utils from "lib/utils";
  import {
    Backend,
    type DesktopBackend,
    type IosAppBackend,
  } from "@platform/backend";

  type DictState =
    | "loading"
    | "loaded"
    | "downloading"
    | "downloaded"
    | "error";

  let state: DictState = "loading";
  let dictDescription = "Loading...";

  async function initialize() {
    const metadata = await PagePlatform.getDictionaryMetadata();
    const downloadDate = new Date(metadata.download_date);
    dictDescription = `Last updated: ${downloadDate.toLocaleDateString()}`;
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
      dictDescription = "Error: " + Utils.getErrorMessage(e);
      console.error(e);
    }
  }

  void initialize();
</script>

<GroupedOptions title="Dictionary">
  <OptionButton
    title="Dictionary file"
    buttonText="Update"
    disabled={state !== "loaded"}
    {onClicked}
  >
    <span class:success={state === "downloaded"}>
      {dictDescription}
    </span>
  </OptionButton>
</GroupedOptions>
