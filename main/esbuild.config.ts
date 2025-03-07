import fs from "node:fs";
import path from "node:path";
import esbuild, { type BuildOptions, type Plugin } from "esbuild";
import sveltePlugin from "esbuild-svelte";
import sveltePreprocess from "svelte-preprocess";
import ejs from "ejs";
import postCssImport from "postcss-import";
import Package from "../package.json" with { type: "json" };
import { watch } from "chokidar";
import type { ExecutionContext } from "extension/browserApi";

const PRODUCTION = process.env.NODE_ENV?.toLowerCase() === "production";
const WATCH = !!process.env.WATCH;

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

/** Package */
const VERSION = Package.version;

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
          watchFiles: ["./src/manifest.json.ejs", "../../package.json"],
        };
      }
      return;
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
  const plugins = [platformAliasPlugin, svelteConfiguredPlugin];
  if (!FOR_IOSAPP) {
    plugins.push(buildManifestPlugin);
  }

  const buildOptions: BuildOptions = {
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
    sourcemap: PRODUCTION ? false : "inline",
    conditions: ["svelte"],
    assetNames: "res/assets/[name]-[hash]",
    // make file import URL absolute path
    // relative path is incorrect from background pages
    publicPath: "/",
    define: {
      __APP_VERSION__: `"${VERSION}"`,
      __APP_PLATFORM__: `"${TARGET!}"`,
      "import.meta.vitest": "undefined",
      __EXTENSION_CONTEXT__: "<<Modified in fn esbuildContext()>>",
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
    plugins,
  };

  return buildOptions;
}

function cleanDirectory(dir: string) {
  if (fs.existsSync(dir)) {
    fs.rmdirSync(dir, { recursive: true });
  }
}

function copyAndWatchFile(
  from: string,
  to: string,
  opts: { watch?: boolean } = {},
) {
  const isDir = fs.lstatSync(from).isDirectory();
  const watcher = watch(from, {
    // ignore dotfiles
    ignored: /(^|[/\\])\../,
  });
  watcher.on("all", (event, p) => {
    let dest: string;
    if (isDir) {
      const rel = path.relative(from, p);
      dest = path.resolve(to, rel);
    } else {
      dest = to;
    }
    if (event === "addDir") {
      fs.mkdirSync(dest, { recursive: true });
    } else if (event === "unlinkDir") {
      fs.rmdirSync(dest);
    } else if (event === "unlink") {
      fs.rmSync(dest);
    } else {
      fs.copyFileSync(p, dest);
    }
  });
  watcher.on("ready", () => {
    if (!opts.watch) {
      void watcher.close();
    }
  });
}

interface BuildEntry {
  in: string;
  out: string;
  context: ExecutionContext;
}

function getbuildEntries(): BuildEntry[] {
  const entries: BuildEntry[] = [];

  if (!FOR_IOSAPP) {
    const segments: string[] = ["content", "background", "popup"];
    if (FOR_IOS) {
      segments.push("x-callback");
    } else {
      segments.push("options");
    }

    for (const seg of segments) {
      entries.push({
        in: `src/extension/${seg}/index.ts`,
        out: `res/${seg}`,
        context:
          seg === "content" ? "contentScript"
          : seg === "background" ? "background"
          : seg === "popup" ? "popup"
          : "page",
      });
    }
    if (!PRODUCTION) {
      entries.push({
        in: "src/iosapp/dictionary.ts",
        out: "res/dictionary",
        context: "page",
      });
    }
  } else {
    const segments = ["options", "optionsAnkiTemplate", "dictionary"];
    for (const seg of segments) {
      entries.push({
        in: `src/iosapp/${seg}.ts`,
        out: `res/${seg}`,
        context: "page",
      });
    }
  }

  return entries;
}

async function esbuildContext(
  entry: BuildEntry,
  buildOptions: esbuild.BuildOptions,
) {
  const clonedOptions = {
    ...buildOptions,
  };
  clonedOptions.entryPoints = [{ in: entry.in, out: entry.out }];
  clonedOptions.define = {
    ...(clonedOptions.define ?? {}),
    __EXTENSION_CONTEXT__: `"${entry.context}"`,
  };
  return esbuild.context(clonedOptions);
}

function copyAndWatchAdditionalFiles(buildOptions: esbuild.BuildOptions) {
  const filesToCopy: [string, string][] = [];
  if (!FOR_IOSAPP) {
    // html
    filesToCopy.push(["src/extension/popup/index.html", "./res/popup.html"]);
    if (FOR_IOS) {
      filesToCopy.push([
        "src/extension/x-callback/index.html",
        "./res/x-callback.html",
      ]);
    } else {
      filesToCopy.push([
        "src/extension/options/index.html",
        "./res/options.html",
      ]);
    }
    if (!PRODUCTION) {
      filesToCopy.push(["src/iosapp/dictionary.html", "./res/dictionary.html"]);
    }
  } else {
    filesToCopy.push(["src/iosapp/options.html", "./res/options.html"]);
    filesToCopy.push([
      "src/iosapp/optionsAnkiTemplate.html",
      "./res/optionsAnkiTemplate.html",
    ]);
    filesToCopy.push(["src/iosapp/dictionary.html", "./res/dictionary.html"]);
  }
  // static assets
  filesToCopy.push(["src/assets/static/", "./res/assets/static"]);

  for (const [from, to] of filesToCopy) {
    const dest = path.resolve(buildOptions.outdir!, to);
    copyAndWatchFile(from, dest, { watch: WATCH });
  }
  console.log(
    `Copied and watching changes to ${filesToCopy.length} file entries`,
  );
}

async function main() {
  const buildOptions = generateBuildOptions();
  if (buildOptions.outdir === undefined) {
    throw new Error("esbuild outdir must be set!");
  }

  cleanDirectory(buildOptions.outdir);

  const entries = getbuildEntries();

  const ctxsP = entries.map((entry) => esbuildContext(entry, buildOptions));
  const ctxs = await Promise.all(ctxsP);

  await Promise.all(ctxs.map((ctx) => ctx.rebuild()));

  copyAndWatchAdditionalFiles(buildOptions);

  if (!WATCH) {
    await Promise.all(ctxs.map((ctx) => ctx.dispose()));
  } else {
    console.info("esbuild: Watching for changes to code..");
    await Promise.all(ctxs.map((ctx) => ctx.watch()));
  }
}

void main();
