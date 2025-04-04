declare module "*.json.gz" {
  const url: string;
  export default url;
}

declare module "*.yomikiridict" {
  const url: string;
  export default url;
}

declare module "*.yomikiriindex" {
  const url: string;
  export default url;
}

declare module "@yomikiri/yomikiri-backend-wasm/yomikiri_backend_wasm_bg.wasm" {
  const url: string;
  export default url;
}

declare module "*.svg" {
  export { SvelteComponent as default } from "svelte";
}

declare module "*.png" {
  const url: string;
  export default url;
}

declare module "*.txt" {
  const content: string;
  export default content;
}

declare module "*.chunk" {
  const content: string;
  export default content;
}

declare const __APP_VERSION__: string;

interface YomikiriEnv {
  EXTENSION_CONTEXT: "page" | "contentScript" | "popup" | "background";
  APP_PLATFORM: "chrome" | "firefox" | "safari_desktop" | "ios" | "iosapp";
}

interface Window {
  YOMIKIRI_ENV: YomikiriEnv;
}
