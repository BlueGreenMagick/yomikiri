import fs from "node:fs";
import path from "node:path";
import esbuild, { type BuildOptions, type Plugin } from "esbuild";
import { copy } from "esbuild-plugin-copy";
import sveltePlugin from "esbuild-svelte";
import sveltePreprocess from "svelte-preprocess";
import ejs from "ejs";
import postCssImport from "postcss-import";
import Package from "./package.json" assert { type: "json" };
import AdmZip from "adm-zip";

const PRODUCTION = process.env.NODE_ENV?.toLowerCase() === "production";
const DEVELOPMENT = !PRODUCTION;

const TARGET = process.env.TARGET_PLATFORM;

if (
  TARGET === undefined ||
  !["chrome", "firefox", "safari_desktop", "ios", "iosapp"].includes(TARGET)
) {
  throw new Error(
    `TARGET_PLATFORM env variable must be set to one of chrome/firefox/safari_desktop/ios/iosapp, but is set to: ${TARGET}`,
  );
}
const FOR_CHROME = TARGET === "chrome";
const FOR_FIREFOX = TARGET === "firefox";
const FOR_SAFARI_DESKTOP = TARGET === "safari_desktop";

const FOR_DESKTOP = ["chrome", "firefox", "safari_desktop"].includes(TARGET);
const FOR_IOS = TARGET === "ios";
const FOR_IOSAPP = TARGET === "iosapp";

const WATCH = DEVELOPMENT && !FOR_IOS && !FOR_IOSAPP;

/** Package */
const VERSION = Package.version;

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
    const outdir = build.initialOptions.outdir;
    if (outdir === undefined) {
      throw new Error("outdir must be set to build manifest!");
    }

    let watching = false;

    build.onStart(() => {
      const raw = fs.readFileSync("./src/manifest.json.ejs", {
        encoding: "utf-8",
      });
      const rendered = ejs.render(raw, {
        version: VERSION,
        chrome: FOR_CHROME,
        firefox: FOR_FIREFOX,
        safari_desktop: FOR_SAFARI_DESKTOP,
        desktop: FOR_DESKTOP,
        ios: FOR_IOS,
        v2: FOR_FIREFOX || FOR_SAFARI_DESKTOP,
      });

      if (!fs.existsSync(outdir)) {
        fs.mkdirSync(outdir, { recursive: true });
      }
      const outPath = path.join(outdir, "manifest.json");
      fs.writeFileSync(outPath, rendered);
      watching = false;
    });

    build.onResolve({ filter: /./ }, (_args) => {
      if (!watching) {
        watching = true;
        return {
          watchFiles: ["./src/manifest.json.ejs"],
        };
      }
      return;
    });
  },
};

/** Watch and rebuild for extra files */
const watchPlugin: Plugin = {
  name: "watchPlugin",
  setup(build) {
    let watching = false;
    build.onStart(() => {
      watching = false;
    });
    build.onResolve({ filter: /./ }, (_args) => {
      if (!watching) {
        watching = true;
        return {
          watchFiles: ["./src/global.css", "./options/styles.css"],
        };
      }
      return null;
    });
  },
};

const svelteConfiguredPlugin: Plugin = sveltePlugin({
  preprocess: sveltePreprocess({
    postcss: {
      plugins: [postCssImport()],
    },
  }),
  compilerOptions: { css: true },
  filterWarnings: (warning) => {
    const ignore = [
      "a11y-no-noninteractive-tabindex",
      "a11y-click-events-have-key-events",
      "css-unused-selector",
    ];
    return !ignore.includes(warning.code);
  },
  include: /\.(?:svelte|svg)$/,
});

function generateBuildOptions(): BuildOptions {
  const baseBuildOptions: BuildOptions = {
    outdir: `build/${TARGET}`,
    target: [
      "es2017",
      ...(FOR_IOS || FOR_IOSAPP ? ["safari15.4"] : []),
      ...(FOR_CHROME ? ["chrome99"] : []),
      ...(FOR_FIREFOX ? ["firefox55"] : []),
      ...(FOR_SAFARI_DESKTOP ? ["safari14.1"] : []),
    ],
    format: "iife",
    bundle: true,
    logLevel: "info",
    // minify: PRODUCTION,
    // keepNames: PRODUCTION,
    sourcemap: DEVELOPMENT ? "inline" : false,
    conditions: ["svelte"],
    assetNames: "res/assets/[name]-[hash]",
    // make file import URL absolute path
    // relative path is incorrect from background pages
    publicPath: "/",
    define: {
      __APP_VERSION__: `"${VERSION}"`,
      __APP_PLATFORM__: `"${TARGET!}"`,
      "import.meta.vitest": "undefined",
    },
    loader: {
      ".wasm": "file",
      ".json.gz": "file",
      ".svg": "text",
      ".png": "file",
      ".yomikiridict": "file",
      ".yomikiriindex": "file",
      ".txt": "text",
      ".chunk": "file",
    },
  };

  const buildOptions: BuildOptions = {
    ...baseBuildOptions,
    entryPoints: [
      { in: "src/extension/content/index.ts", out: "res/content" },
      { in: "src/extension/background/index.ts", out: "res/background" },
      { in: "src/extension/popup/index.ts", out: "res/popup" },
      ...(FOR_IOS ?
        [{ in: "src/extension/x-callback/index.ts", out: "res/x-callback" }]
      : [{ in: "src/extension/options/index.ts", out: "res/options" }]),
      ...(DEVELOPMENT ?
        [{ in: "src/iosapp/dictionary.ts", out: "res/dictionary" }]
      : []),
    ],
    plugins: [
      logRebuildPlugin,
      platformAliasPlugin,
      buildManifestPlugin,
      watchPlugin,
      copy({
        assets: [
          // html
          {
            from: ["src/extension/popup/index.html"],
            to: ["./res/popup.html"],
          },
          ...(FOR_IOS ?
            [
              {
                from: ["src/extension/x-callback/index.html"],
                to: ["./res/x-callback.html"],
              },
            ]
          : [
              {
                from: ["src/extension/options/index.html"],
                to: ["./res/options.html"],
              },
            ]),
          ...(DEVELOPMENT ?
            [
              {
                from: ["src/iosapp/dictionary.html"],
                to: ["./res/dictionary.html"],
              },
            ]
          : []),
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
    entryPoints: [
      { in: "src/iosapp/options.ts", out: "res/options" },
      {
        in: "src/iosapp/optionsAnkiTemplate.ts",
        out: "res/optionsAnkiTemplate",
      },
      {
        in: "src/iosapp/dictionary.ts",
        out: "res/dictionary",
      },
    ],
    plugins: [
      copy({
        assets: [
          { from: ["src/iosapp/options.html"], to: ["./res/options.html"] },
          {
            from: ["src/iosapp/optionsAnkiTemplate.html"],
            to: ["./res/optionsAnkiTemplate.html"],
          },
          {
            from: ["src/iosapp/dictionary.html"],
            to: ["./res/dictionary.html"],
          },
          { from: ["src/assets/static/**/*"], to: ["./res/assets/static"] },
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

function cleanDirectory(dir: string) {
  if (fs.existsSync(dir)) {
    fs.rmdirSync(dir, { recursive: true });
  }
}

async function compressDirectoryTo(dir: string, outfile: string) {
  const zip = new AdmZip();
  await zip.addLocalFolderPromise(dir, {
    filter: (path) => !path.startsWith("."),
  });
  await zip.writeZipPromise(outfile, { overwrite: true });
}

async function main() {
  const buildOptions = generateBuildOptions();
  if (buildOptions.outdir === undefined) {
    throw new Error("esbuild outdir must be set!");
  }

  cleanDirectory(buildOptions.outdir);

  const ctx = await esbuild.context(buildOptions);
  await ctx.rebuild();

  if (!WATCH) {
    await ctx.dispose();
    if (PRODUCTION && (FOR_CHROME || FOR_FIREFOX)) {
      const compressedFile = path.join(
        buildOptions.outdir,
        "..",
        `yomikiri_${TARGET}_v${VERSION}.zip`,
      );
      console.log("Compressing file to: " + compressedFile);
      await compressDirectoryTo(buildOptions.outdir, compressedFile);
    }
  } else {
    console.info("esbuild: Watching for changes to code..");
    await ctx.watch();
  }
}

void main();
