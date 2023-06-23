import fs from "node:fs";
import path from "node:path";
import esbuild from "esbuild";
import { copy } from "esbuild-plugin-copy";
import sveltePlugin from "esbuild-svelte";
import sveltePreprocess from "svelte-preprocess";
import ejs from "ejs";

const DEVELOPMENT = process.env.NODE_ENV === "development";
const PRODUCTION = process.env.NODE_ENV === "production";

if (
  !["chrome", "firefox", "safari_desktop", "ios"].includes(
    process.env.TARGET_PLATFORM
  )
) {
  throw new Error(
    "TARGET_PLATFORM env variable must be set to one of chrome/firefox/safari_desktop/ios, but is set to: " +
      process.env.TARGET_PLATFORM
  );
}
const FOR_CHROME = process.env.TARGET_PLATFORM === "chrome";
const FOR_FIREFOX = process.env.TARGET_PLATFORM === "firefox";
const FOR_SAFARI_DESKTOP = process.env.TARGET_PLATFORM === "safari_desktop";

const FOR_DESKTOP = ["chrome", "firefox", "safari_desktop"].includes(
  process.env.TARGET_PLATFORM
);
const FOR_IOS = process.env.TARGET_PLATFORM === "ios";

const WATCH = DEVELOPMENT && !FOR_IOS;

const setWatchOptionPlugin = {
  name: "setWatchOptionPlugin",
  setup(build) {
    if (WATCH) {
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

const buildManifestPlugin = {
  name: "buildManifestPlugin",
  setup(build) {
    const raw = fs.readFileSync("./src/manifest.json.ejs", {
      encoding: "utf-8",
    });
    const rendered = ejs.render(raw, {
      chrome: FOR_CHROME,
      firefox: FOR_FIREFOX,
      safari_desktop: FOR_SAFARI_DESKTOP,
      desktop: FOR_DESKTOP,
      ios: FOR_IOS,
      // v2 is not supported for ios
      v2: false,
    });
    const outdir = build.initialOptions.outdir;
    if (!fs.existsSync(outdir)) {
      fs.mkdirSync(outdir, { recursive: true });
    }
    const outPath = path.join(outdir, "manifest.json");
    fs.writeFileSync(outPath, rendered);
  },
};

const buildOptions = {
  entryPoints: [
    { in: "src/content/index.ts", out: "content" },
    { in: "src/background/index.ts", out: "background" },
    { in: "src/popup/index.ts", out: "popup" },
    { in: "src/options/index.ts", out: "options" },
    { in: "src/x-callback/index.ts", out: "x-callback" },
  ],
  outdir: "build",
  target: "es6",
  format: "iife",
  bundle: true,
  logLevel: "info",
  sourcemap: DEVELOPMENT ? "inline" : false,
  conditions: ["svelte"],
  plugins: [
    logRebuildPlugin,
    setWatchOptionPlugin,
    platformAliasPlugin,
    buildManifestPlugin,
    copy({
      assets: [
        { from: ["src/options/index.html"], to: ["./options.html"] },
        { from: ["src/popup/index.html"], to: ["./popup.html"] },
        { from: ["src/x-callback/index.html"], to: ["./x-callback.html"] },
        { from: ["src/*.json"], to: ["./"] },
        { from: ["src/assets/static/**/*"], to: ["assets/static"] },
      ],
      watch: true,
      // verbose: true,
    }),
    sveltePlugin({
      preprocess: sveltePreprocess(),
      compilerOptions: { css: true },
      filterWarnings: (warning) => {
        const ignore = [
          "a11y-no-noninteractive-tabindex",
          "a11y-click-events-have-key-events",
        ];
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

if (!WATCH) {
  ctx.dispose();
} else {
  console.info("esbuild: Watching for changes to code..");
  await ctx.watch();
}
