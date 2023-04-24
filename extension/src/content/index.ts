import { Scanner } from "./scanner";

const scanner = new Scanner();

async function trigger(x: number, y: number) {
  const token = await scanner.scanAt(x, y);
  console.log(token);
}

document.addEventListener("mousemove", (ev) => {
  if (ev.shiftKey) {
    trigger(ev.clientX, ev.clientY);
  }
});
