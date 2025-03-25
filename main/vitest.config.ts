import { defineConfig } from "vitest/config";
import sveltePreprocess from "svelte-preprocess";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import path from "node:path";
import postCssImport from "postcss-import";
import tsconfigPathsPlugin from "vite-tsconfig-paths";
import Package from "../package.json" with { type: "json" };

const svelteConfiguredPlugin = svelte({
  preprocess: sveltePreprocess({
    postcss: {
      plugins: [postCssImport()],
    },
  }),
  compilerOptions: { css: true },
  onwarn: (warning, defaultHandler) => {
    const ignore = [
      "a11y-no-noninteractive-tabindex",
      "a11y-click-events-have-key-events",
      "css-unused-selector",
    ];
    if (ignore.includes(warning.code)) return;
    defaultHandler!(warning);
  },
  extensions: [".svelte", ".svg"],
});

/* resolve path relative to './src' */
function fullpath(relative: string): string {
  return path.resolve(import.meta.dirname, "src", relative);
}

export default defineConfig({
  plugins: [tsconfigPathsPlugin(), svelteConfiguredPlugin],
  define: {
    __APP_VERSION__: `"${Package.version}"`,
  },
  assetsInclude: [
    "**/*.wasm",
    "**/*.json.gz",
    "**/*.yomikiridict",
    "**/*.yomikiriindex",
    "**/*.chunk",
  ],
  resolve: {
    alias: {
      "#platform": fullpath("platform/desktop"),
      "#icons": fullpath("../node_modules/ionicons/dist/svg"),
      "#": fullpath("."),
    },
  },
  build: {
    target: ["es2017", "chrome99", "firefox55", "safari14.1"],
  },
  test: {
    environment: "jsdom",
    // watch: false,
    setupFiles: [path.resolve(import.meta.dirname, "test", "setup", "index")],
  },
});
