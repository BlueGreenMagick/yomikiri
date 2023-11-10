<!--
  @component
  ios style where button text becomes lighter on tap.
  - label [string]
  - on:click [ClickEvent]: also catches taps on mobile

  Uses event listener for touch because `:active` does not detect if touch moves out of element.
-->

<script lang="ts">
  import Utils from "~/utils";

  export let label: string;

  let elem: HTMLElement;
  let tap: boolean = false;

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
    tap = true;
  }

  function onTouchEnd(ev: TouchEvent) {
    tap = isTouching(ev.targetTouches);
  }

  function onTouchMove(ev: TouchEvent) {
    tap = isTouching(ev.targetTouches);
  }
</script>

<span
  bind:this={elem}
  class:tap
  on:click
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

  span.tap,
  :global(html.desktop) span:active:hover {
    filter: opacity(0.6);
  }

  span:hover {
    cursor: pointer;
  }
</style>
