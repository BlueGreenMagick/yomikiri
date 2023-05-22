import esbuild from "esbuild";
import { copy } from "esbuild-plugin-copy";
import sveltePlugin from "esbuild-svelte";
import sveltePreprocess from "svelte-preprocess";

const DEVELOPMENT = process.env.NODE_ENV === "development";
const PRODUCTION = process.env.NODE_ENV === "production";

if (!["desktop", "ios"].includes(process.env.TARGET_PLATFORM)) {
  throw (
    "TARGET_PLATFORM env variable must be set to either 'desktop'/'ios', but is set to: " +
    process.env.TARGET_PLATFORM
  );
}

const FOR_IOS = process.env.TARGET_PLATFORM === "ios";

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

const platformAliasPlugin = {
  name: "platformAliasPlugin",
  setup(build) {
    build.onResolve({ filter: /.*/ }, (args) => {
      let replacement;
      if (FOR_IOS) {
        replacement = "platform/ios$1";
      } else {
        replacement = "platform/desktop$1";
      }
      const replaced = args.path.replace(/^@platform($|\/)/, replacement);
      if (args.path === replaced) {
        return;
      }
      delete args.path;
      const resolved = build.resolve(replaced, args);
      return resolved;
    });
  },
};

const buildOptions = {
  entryPoints: [
    { in: "src/content/index.ts", out: "content" },
    { in: "src/index.ts", out: "background" },
    { in: "src/popup/index.ts", out: "popup/popup" },
    { in: "src/options/index.ts", out: "options/options" },
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
    platformAliasPlugin,
    copy({
      assets: [
        { from: ["src/**/*.html"], to: ["./"] },
        { from: ["src/*.json"], to: ["./"] },
        { from: ["src/res/**/*"], to: ["res"] },
      ],
      watch: true,
      // verbose: true,
    }),
    sveltePlugin({
      preprocess: sveltePreprocess(),
      compilerOptions: { css: true },
      filterWarnings: (warning) => {
        const ignore = ["a11y-no-noninteractive-tabindex"];
        return !ignore.includes(warning.code);
      },
    }),
  ],
  assetNames: "assets/[name]-[hash]",
  loader: { ".wasm.gz": "file", ".json.gz": "file", ".svg": "text" },
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
