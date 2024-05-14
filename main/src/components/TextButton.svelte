<!--
  @component
  ios style where button text becomes lighter on tap.
  - label [string]
  - on:click [ClickEvent]: also catches taps on mobile
  - style: button style. default="default"

  Uses event listener for touch because `:active` does not detect if touch moves out of element.
-->

<script lang="ts">
  import Utils from "lib/utils";

  export let label: string;
  export let disabled = false;
  export let style: "default" | "warn" = "default";
  export let onClick: (ev: MouseEvent) => void = (_) => null;

  let elem: HTMLElement;
  let tapped = false;

  function onElemClick(ev: MouseEvent) {
    if (!disabled) {
      onClick(ev);
    }
  }

  function isTouching(touches: TouchList): boolean {
    let rect = elem.getBoundingClientRect();
    for (const touch of touches) {
      let adjustedRect = {
        top: rect.top - touch.radiusY,
        bottom: rect.bottom + touch.radiusY,
        left: rect.left - touch.radiusX,
        right: rect.right + touch.radiusX,
      };
      if (Utils.rectContainsPoint(adjustedRect, touch.clientX, touch.clientY)) {
        return true;
      }
    }
    return false;
  }

  function onTouchStart(_ev: TouchEvent) {
    tapped = true;
  }

  function onTouchEnd(ev: TouchEvent) {
    tapped = isTouching(ev.targetTouches);
  }

  function onTouchMove(ev: TouchEvent) {
    tapped = isTouching(ev.targetTouches);
  }
</script>

<button
  bind:this={elem}
  class:tapped
  class:disabled
  class:warn={style == "warn"}
  on:click={onElemClick}
  on:touchstart={onTouchStart}
  on:touchcancel={onTouchEnd}
  on:touchend={onTouchEnd}
  on:touchmove={onTouchMove}>{label}</button
>

<style>
  button {
    display: inline;
    color: var(--selected-blue);
    -webkit-tap-highlight-color: transparent;
    transition: filter 0.2s;
    -webkit-user-select: none;
    user-select: none;
  }

  button.warn {
    color: var(--text-warn);
  }
  button.disabled {
    opacity: 0.4;
  }

  button:focus-visible {
    outline-offset: 4px;
  }

  button.tapped:not(.disabled),
  :global(html.desktop) button:not(.disabled):active:hover {
    filter: opacity(0.6);
  }

  button:not(.disabled):hover {
    cursor: pointer;
  }
</style>
