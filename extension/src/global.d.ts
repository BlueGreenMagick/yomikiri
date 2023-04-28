/// <reference types="svelte" />

declare module "*.json.gz" {
  let url: string;
  export default url;
}

declare module "*.json" {
  let content: any;
  export default content;
}

declare module "*.svg" {
  let content: any;
  export default content;
}
