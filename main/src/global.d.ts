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

declare module "@yomikiri/yomikiri-backend/yomikiri_rs_bg.wasm" {
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
declare const __APP_PLATFORM__:
  | "chrome"
  | "firefox"
  | "safari_desktop"
  | "ios"
  | "iosapp";
