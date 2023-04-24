import { Scanner } from "./scanner";

const scanner = new Scanner();

async function trigger(x: number, y: number) {
  const result = await scanner.scanAt(x, y);
  console.log(result);
}

document.addEventListener("mousemove", (ev) => {
  if (ev.shiftKey) {
    trigger(ev.clientX, ev.clientY);
  }
});
