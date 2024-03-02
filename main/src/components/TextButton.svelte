<!--
  @component
  ios style where button text becomes lighter on tap.
  - label [string]
  - on:click [ClickEvent]: also catches taps on mobile
  - style: button style. default="default"

  Uses event listener for touch because `:active` does not detect if touch moves out of element.
-->

<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import Utils from "~/utils";

  export let label: string;
  export let disabled: boolean = false;
  export let style: "default" | "warn" = "default";

  interface Events {
    click: MouseEvent;
  }

  const dispatch = createEventDispatcher<Events>();

  let elem: HTMLElement;
  let tapped: boolean = false;

  function onClick(ev: MouseEvent) {
    if (!disabled) {
      dispatch("click", ev);
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

  function onTouchStart(ev: TouchEvent) {
    tapped = true;
  }

  function onTouchEnd(ev: TouchEvent) {
    tapped = isTouching(ev.targetTouches);
  }

  function onTouchMove(ev: TouchEvent) {
    tapped = isTouching(ev.targetTouches);
  }
</script>

<span
  bind:this={elem}
  class:tapped
  class:disabled
  class:warn={style == "warn"}
  on:click={onClick}
  on:touchstart={onTouchStart}
  on:touchcancel={onTouchEnd}
  on:touchend={onTouchEnd}
  on:touchmove={onTouchMove}>{label}</span
>

<style>
  span {
    color: var(--selected-blue);
    -webkit-tap-highlight-color: transparent;
    transition: filter 0.2s;
    -webkit-user-select: none;
    user-select: none;
  }

  span.warn {
    color: var(--text-warn);
  }
  span.disabled {
    opacity: 0.4;
  }

  span.tapped:not(.disabled),
  :global(html.desktop) span:not(.disabled):active:hover {
    filter: opacity(0.6);
  }

  span:not(.disabled):hover {
    cursor: pointer;
  }
</style>
