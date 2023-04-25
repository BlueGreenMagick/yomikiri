import esbuild from "esbuild";
import { copy } from "esbuild-plugin-copy";
import sveltePlugin from "esbuild-svelte";
import sveltePreprocess from "svelte-preprocess";

const DEVELOPMENT = process.env.NODE_ENV === "development";
const PRODUCTION = process.env.NODE_ENV === "production";

const setWatchOptionPlugin = {
  name: "setWatchOptionPlugin",
  setup(build) {
    if (DEVELOPMENT) {
      Object.defineProperty(build.initialOptions, "watch", {
        get() {
          return true;
        },
      });
    }
  },
};

const logRebuildPlugin = {
  name: "logRebuildPlugin",
  setup(build) {
    build.onStart(() => {
      console.info("\n=====  esbuild: Build start  =====");
    });
    build.onEnd(() => {
      console.info("=====  esbuild: Build end  =====\n");
    });
  },
};

const buildOptions = {
  entryPoints: [
    { in: "src/content/index.ts", out: "content" },
    { in: "src/index.ts", out: "background" },
    { in: "src/popup/index.ts", out: "popup/popup" },
  ],
  outdir: "build",
  target: "es6",
  format: "iife",
  bundle: true,
  logLevel: "info",
  sourcemap: DEVELOPMENT,
  plugins: [
    logRebuildPlugin,
    setWatchOptionPlugin,
    copy({
      assets: [
        { from: ["src/**/*.html"], to: ["./"] },
        { from: ["src/*.json"], to: ["./"] },
        { from: ["src/resources/**/*"], to: ["resources"] },
      ],
      watch: true,
      verbose: true,
    }),
    sveltePlugin({
      preprocess: sveltePreprocess(),
      compilerOptions: { css: true },
    }),
  ],
  assetNames: "assets/[name]-[hash]",
  loader: { ".wasm": "file", ".json.gz": "file" },
};

const serveOptions = {
  servedir: ".",
};

const ctx = await esbuild.context(buildOptions);

await ctx.rebuild();

if (!DEVELOPMENT) {
  ctx.dispose();
} else {
  console.info("esbuild: Watching for changes to code..");
  await ctx.watch();
}
