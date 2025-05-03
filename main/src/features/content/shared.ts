import { Highlighter } from "./highlight";
import { Tooltip } from "./tooltip";
import Utils from "@/features/utils";
import { Config } from "@/features/config";

Config.instance.onInitialize(handleStateEnabledChange);

export const highlighter = new Highlighter(() => {
  lazyTooltip.getIfInitialized()?.hide();
});
export const lazyTooltip = new Utils.LazyAsync(
  async () => new Tooltip(await Config.instance.get(), highlighter),
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
