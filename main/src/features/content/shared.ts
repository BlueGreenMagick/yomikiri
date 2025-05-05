import { Highlighter } from "./highlight";
import { Tooltip } from "./tooltip";
import Utils from "@/features/utils";
import { Config } from "@/features/config";

Config.instance.onInitialize(handleStateEnabledChange);

export const highlighter = new Highlighter(() => {
  lazyTooltip.getIfInitialized()?.hide();
});
export const lazyTooltip = new Utils.LazyAsync(createTooltip);

async function createTooltip() {
  const config = await Config.instance.get();
  const tooltip = new Tooltip(config, highlighter);

  // add ResizeObserver to document and change position on document resize
  let repositionRequested = false;
  const resizeObserver = new ResizeObserver((_) => {
    if (!tooltip.visible || repositionRequested) return;
    repositionRequested = true;

    requestAnimationFrame(() => {
      repositionRequested = false;
      const rects = highlighter.highlightedRects();
      tooltip.move(rects);
    });
  });
  resizeObserver.observe(document.documentElement);

  return tooltip;
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
