import { Highlighter } from "./highlight";
import { Tooltip } from "extension/content/tooltip";
import Utils, { LazyAsync } from "lib/utils";
import { Config } from "lib/config";
import { ExtensionPlatform as Platform } from "@platform";

Config.instance.onInitialize(handleStateEnabledChange);

export const lazyAnkiApi = new LazyAsync(async () =>
  Platform.newAnkiApi(await Config.instance.get()),
);
export const highlighter = new Highlighter(() => {
  lazyTooltip.getIfInitialized()?.hide();
});
export const lazyTooltip = new Utils.LazyAsync(
  async () =>
    new Tooltip(
      await Config.instance.get(),
      await lazyAnkiApi.get(),
      highlighter,
    ),
);

function handleStateEnabledChange(config: Config) {
  const enabledState = config.store("state.enabled");
  enabledState.subscribe((enabled) => {
    if (!enabled) {
      lazyTooltip.getIfInitialized()?.hide();
      highlighter.unhighlight();
    }
  });
}
