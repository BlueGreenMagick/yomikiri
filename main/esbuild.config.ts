import fs from "node:fs";
import path from "node:path";
import esbuild, { type BuildOptions, type Plugin } from "esbuild";
import sveltePlugin from "esbuild-svelte";
import sveltePreprocess from "svelte-preprocess";
import ejs from "ejs";
import postCssImport from "postcss-import";
import Package from "../package.json" with { type: "json" };
import { watch } from "chokidar";

const PRODUCTION = process.env.NODE_ENV?.toLowerCase() === "production";
const WATCH = !!process.env.WATCH;

const TARGET_PLATFORMS = [
  "chrome",
  "firefox",
  "safari_desktop",
  "ios",
  "iosapp",
] as const;
type TargetPlatforms = (typeof TARGET_PLATFORMS)[number];

const TARGET = process.env.TARGET_PLATFORM as TargetPlatforms;

if (TARGET === undefined || !TARGET_PLATFORMS.includes(TARGET)) {
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

interface EntryPoints {
  extension: EntryPointGroup;
  iosapp: EntryPointGroup;
}

type EntryPointGroup = {
  [name: string]: EntryPointConfig;
};

interface EntryPointConfig {
  html?: boolean;
  /** default: `true` for `extension` group */
  ios?: boolean;
  /** default: `true` for `extension` group*/
  desktop?: boolean;
  /** Extension context. default: `"page"` */
  context?: "page" | "contentScript" | "background" | "popup";
}

type EntryPointId = [keyof EntryPoints, string];

const ENTRY_POINTS: EntryPoints = {
  extension: {
    background: {
      context: "background",
    },
    content: {
      context: "contentScript",
    },
    options: {
      ios: false,
    },
    popup: {},
    "x-callback": {
      desktop: false,
    },
  },
  iosapp: {
    dictionary: {},
    options: {},
    optionsAnkiTemplate: {},
  },
};

function entryPointsForTarget(): EntryPointId[] {
  const entryPoints: [keyof EntryPoints, string][] = [];
  if (FOR_DESKTOP) {
    const grp = ENTRY_POINTS["extension"];
    for (const name in grp) {
      const opts = grp[name];
      if (opts.desktop ?? true) {
        entryPoints.push(["extension", name]);
      }
    }
  } else if (FOR_IOS) {
    const grp = ENTRY_POINTS["extension"];
    for (const name in grp) {
      const opts = grp[name];
      if (opts.ios ?? true) {
        entryPoints.push(["extension", name]);
      }
    }
  } else if (FOR_IOSAPP) {
    const grp = ENTRY_POINTS["iosapp"];
    for (const name in grp) {
      entryPoints.push(["iosapp", name]);
    }
  }
  return entryPoints;
}

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

/** For each entrypoint, add code to set up `YOMIKIRI_ENV` global variable. */
const entryPointEnvPlugin: Plugin = {
  name: "entryPointEnvPlugin",
  setup(build) {
    const entryPoints = entryPointsForTarget();
    const pathsMap = entryPoints.reduce<Map<string, EntryPointId>>(
      (map, [group, name]) => {
        const baseDir = build.initialOptions.absWorkingDir ?? "";
        const resolved = path.resolve(
          baseDir,
          `src/entryPoints/${group}/${name}/index.ts`,
        );
        map.set(resolved, [group, name]);
        return map;
      },
      new Map(),
    );

    build.onLoad({ filter: /\.ts/ }, async (args) => {
      const pathsMapObj = pathsMap.get(args.path);
      if (pathsMapObj === undefined) {
        return;
      }
      const [groupName, name] = pathsMapObj;

      const textContent = await fs.promises.readFile(args.path, "utf8");
      const envImport = `import "$entryPointEnv/${groupName}/${name}"\n${textContent}`;
      return {
        contents: envImport,
        loader: "ts",
      };
    });

    build.onResolve({ filter: /\$entryPointEnv\/.+/ }, (args) => {
      return {
        path: args.path,
        namespace: "entryPointEnv-generate",
      };
    });

    build.onLoad(
      { filter: /.*/, namespace: "entryPointEnv-generate" },
      (args) => {
        const [_, groupName, name] = args.path.split("/");
        const opts = ENTRY_POINTS[groupName as keyof EntryPoints][name];

        const extensionContext = opts.context ?? "page";
        const script = `
        self.YOMIKIRI_ENV = {
          EXTENSION_CONTEXT: "${extensionContext}",
          APP_PLATFORM: "${TARGET}"
        };`;
        return {
          contents: script,
          loader: "ts",
        };
      },
    );
  },
};

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

function copyAndWatchAdditionalFiles(buildOptions: esbuild.BuildOptions) {
  const filesToCopy: [string, string][] = [];
  // html files
  const entryPoints = entryPointsForTarget();
  for (const [group, name] of entryPoints) {
    const extensionContext = ENTRY_POINTS[group][name].context ?? "page";
    const hasHTML =
      extensionContext !== "contentScript" && extensionContext !== "background";

    if (hasHTML) {
      filesToCopy.push([
        `src/entryPoints/${group}/${name}/index.html`,
        `./res/${name}.html`,
      ]);
    }
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
  const outdir = `build/${TARGET}`;
  const entryPointIds = entryPointsForTarget();

  const buildOptions: BuildOptions = {
    outdir,
    entryPoints: entryPointIds.map(([group, name]) => ({
      in: `src/entryPoints/${group}/${name}/index.ts`,
      out: `res/${name}`,
    })),
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
    plugins: [
      entryPointEnvPlugin,
      platformAliasPlugin,
      svelteConfiguredPlugin,
      ...(!FOR_IOSAPP ? [buildManifestPlugin] : []),
    ],
  };

  cleanDirectory(outdir);

  const context = await esbuild.context(buildOptions);
  await context.rebuild();
  copyAndWatchAdditionalFiles(buildOptions);

  if (WATCH) {
    console.info("esbuild: Watching for changes to code..");
    await context.watch();
  }
}

void main();
