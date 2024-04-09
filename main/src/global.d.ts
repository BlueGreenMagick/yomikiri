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
  export { SvelteComponent as default } from 'svelte';
}

declare module "*.txt" {
  const content: string;
  export default content;
}

declare module "*.chunk" {
  const content: string;
  export default content;
}
