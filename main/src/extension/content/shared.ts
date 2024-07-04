import { Highlighter } from "./highlight";
import { Tooltip } from "extension/content/tooltip";
import Utils from "lib/utils";
import { Config } from "lib/config";
import { AnkiApi } from "@platform/anki";

Config.instance.onInitialize(handleStateEnabledChange);

export const highlighter = new Highlighter(() => {
  lazyTooltip.getIfInitialized()?.hide();
});
export const lazyTooltip = new Utils.LazyAsync(
  async () =>
    new Tooltip(
      await Config.instance.get(),
      await AnkiApi.instance.get(),
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
