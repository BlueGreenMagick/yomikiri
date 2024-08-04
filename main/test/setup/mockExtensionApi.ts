import { vi } from "vitest";

/* Mock 'chrome' extension API */
const MAGICAL_OBJECT: () => void = new Proxy(() => {}, {
  get: () => MAGICAL_OBJECT,
  apply: () => {},
});
vi.stubGlobal("chrome", MAGICAL_OBJECT);
vi.stubGlobal("browser", MAGICAL_OBJECT);
