import { handleClick, handleMouseMove } from "./handlers";

export function setupListeners() {
  document.addEventListener("mousemove", handleMouseMove);
  document.addEventListener("click", handleClick);
}
