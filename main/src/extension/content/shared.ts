import { Highlighter } from "./highlight";
import { Tooltip } from "extension/content/tooltip";
import Utils, { LazyAsync } from "lib/utils";
import { Config } from "lib/config";
import { ExtensionPlatform as Platform } from "@platform";

export const lazyConfig = new Utils.LazyAsync(createConfig);
export const lazyAnkiApi = new LazyAsync(async () =>
  Platform.newAnkiApi(await lazyConfig.get()),
);
export const highlighter = new Highlighter(() => {
  lazyTooltip.getIfInitialized()?.hide();
});
export const lazyTooltip = new Utils.LazyAsync(
  async () =>
    new Tooltip(await lazyConfig.get(), await lazyAnkiApi.get(), highlighter),
);

async function createConfig() {
  const config = await Config.initialize();
  handleStateEnabledChange(config);
  return config;
}

function handleStateEnabledChange(config: Config) {
  const enabledState = config.store("state.enabled");
  enabledState.subscribe((enabled) => {
    if (!enabled) {
      lazyTooltip.getIfInitialized()?.hide();
      highlighter.unhighlight();
    }
  });
}
