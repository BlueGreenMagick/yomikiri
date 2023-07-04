import fs from "node:fs";
import path from "node:path";
import esbuild, { BuildOptions, Plugin } from "esbuild";
import { copy } from "esbuild-plugin-copy";
import sveltePlugin from "esbuild-svelte";
import sveltePreprocess from "svelte-preprocess";
import ejs from "ejs";

const DEVELOPMENT = process.env.NODE_ENV === "development";
const PRODUCTION = process.env.NODE_ENV === "production";

const TARGET = process.env.TARGET_PLATFORM;

if (
  TARGET === undefined ||
  !["chrome", "firefox", "safari_desktop", "ios", "iosapp"].includes(TARGET)
) {
  throw new Error(
    "TARGET_PLATFORM env variable must be set to one of chrome/firefox/safari_desktop/ios/iosapp, but is set to: " +
      TARGET
  );
}
const FOR_CHROME = TARGET === "chrome";
const FOR_FIREFOX = TARGET === "firefox";
const FOR_SAFARI_DESKTOP = TARGET === "safari_desktop";

const FOR_DESKTOP = ["chrome", "firefox", "safari_desktop"].includes(TARGET);
const FOR_IOS = TARGET === "ios";
const FOR_IOSAPP = TARGET === "iosapp";

const WATCH = DEVELOPMENT && !FOR_IOS;

const logRebuildPlugin: Plugin = {
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

const platformAliasPlugin: Plugin = {
  name: "platformAliasPlugin",
  setup(build) {
    build.onResolve({ filter: /.*/ }, (args) => {
      let replacement;
      if (FOR_IOS) {
        replacement = "platform/ios$1";
      } else if (FOR_IOSAPP) {
        replacement = "platform/iosapp$1";
      } else {
        replacement = "platform/desktop$1";
      }
      const replaced = args.path.replace(/^@platform($|\/)/, replacement);
      if (args.path === replaced) {
        return;
      }
      const { path: _, ...opts } = { ...args };
      return build.resolve(replaced, opts);
    });
  },
};

const buildManifestPlugin: Plugin = {
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
    if (outdir === undefined) {
      throw new Error("outdir must be set to build manifest!");
    }
    if (!fs.existsSync(outdir)) {
      fs.mkdirSync(outdir, { recursive: true });
    }
    const outPath = path.join(outdir, "manifest.json");
    fs.writeFileSync(outPath, rendered);
  },
};

const svelteConfiguredPlugin: Plugin = sveltePlugin({
  preprocess: sveltePreprocess(),
  compilerOptions: { css: true },
  filterWarnings: (warning) => {
    const ignore = [
      "a11y-no-noninteractive-tabindex",
      "a11y-click-events-have-key-events",
    ];
    return !ignore.includes(warning.code);
  },
});

function generateBuildOptions(): BuildOptions {
  const baseBuildOptions: BuildOptions = {
    outdir: `build/${TARGET}`,
    target: "es6",
    format: "iife",
    bundle: true,
    logLevel: "info",
    sourcemap: DEVELOPMENT ? "inline" : false,
    conditions: ["svelte"],
    assetNames: "res/assets/[name]-[hash]",
    loader: { ".wasm.gz": "file", ".json.gz": "file", ".svg": "text" },
  };

  const buildOptions: BuildOptions = {
    ...baseBuildOptions,
    entryPoints: [
      { in: "src/content/index.ts", out: "res/content" },
      { in: "src/background/index.ts", out: "res/background" },
      { in: "src/popup/index.ts", out: "res/popup" },
      ...(FOR_IOS
        ? [{ in: "src/x-callback/index.ts", out: "res/x-callback" }]
        : [{ in: "src/options/index.ts", out: "res/options" }]),
    ],
    plugins: [
      logRebuildPlugin,
      platformAliasPlugin,
      buildManifestPlugin,
      copy({
        assets: [
          // html
          { from: ["src/popup/index.html"], to: ["./res/popup.html"] },
          ...(FOR_IOS
            ? [
                {
                  from: ["src/x-callback/index.html"],
                  to: ["./res/x-callback.html"],
                },
              ]
            : [
                {
                  from: ["src/options/index.html"],
                  to: ["./res/options.html"],
                },
              ]),
          // static assets
          { from: ["src/assets/static/**/*"], to: ["./res/assets/static"] },
        ],
        watch: true,
        // verbose: true,
      }),
      svelteConfiguredPlugin,
    ],
  };

  const iosAppBuildOptions: BuildOptions = {
    ...baseBuildOptions,
    entryPoints: [{ in: "src/options/index.ts", out: "res/options" }],
    plugins: [
      copy({
        assets: [
          { from: ["src/options/index.html"], to: ["./res/options.html"] },
        ],
      }),
      platformAliasPlugin,
      svelteConfiguredPlugin,
    ],
  };

  if (FOR_IOSAPP) {
    return iosAppBuildOptions;
  } else {
    return buildOptions;
  }
}

function cleanDirectory(dir) {
  if (fs.existsSync(dir)) {
    fs.rmdirSync(dir, { recursive: true });
  }
}

async function main() {
  const buildOptions = generateBuildOptions();
  cleanDirectory(buildOptions.outdir);

  const ctx = await esbuild.context(buildOptions);
  await ctx.rebuild();

  if (!WATCH) {
    ctx.dispose();
  } else {
    console.info("esbuild: Watching for changes to code..");
    await ctx.watch();
  }
}

main();
