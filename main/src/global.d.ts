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

declare module "*.svg" {
  import { SvelteComponent_1 } from "svelte";
  const content: SvelteComponent_1;
  export default content;
}

declare module "*.txt" {
  const content: string;
  export default content;
}

declare module "*.chunk" {
  const content: string;
  export default content;
}
