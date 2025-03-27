import fs from "node:fs";
import path from "node:path";
import esbuild, { type BuildOptions, type Plugin } from "esbuild";
import sveltePlugin from "esbuild-svelte";
import sveltePreprocess from "svelte-preprocess";
import ejs from "ejs";
import postCssImport from "postcss-import";
import Package from "../package.json" with { type: "json" };
import {
  watch as chokidarWatch,
  type Matcher as ChokidarMatcher,
} from "chokidar";

const PRODUCTION = process.env.NODE_ENV?.toLowerCase() === "production";
const WATCH = !!process.env.WATCH;

const TARGET_PLATFORMS = [
  "chrome",
  "firefox",
  "safari_desktop",
  "ios",
  "iosapp",
  "android",
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
const FOR_ANDROID = TARGET === "android";

/** Package */
const VERSION = Package.version;

interface EntryPoints {
  extension: EntryPointGroup;
  iosapp: EntryPointGroup;
  android: EntryPointGroup;
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
  android: {
    website: {},
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
  } else if (FOR_ANDROID) {
    const grp = ENTRY_POINTS["android"];
    for (const name in grp) {
      entryPoints.push(["android", name]);
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
        replacement = "@/platform/ios$1";
      } else if (FOR_IOSAPP) {
        replacement = "@/platform/iosapp$1";
      } else if (FOR_DESKTOP) {
        replacement = "@/platform/desktop$1";
      } else if (FOR_ANDROID) {
        replacement = "@/platform/android$1";
      } else {
        throw new Error("Unknown platform");
      }
      const replaced = args.path.replace(/^#platform($|\/)/, replacement);
      if (args.path === replaced) {
        return;
      }
      const { path: _, ...opts } = { ...args };
      return build.resolve(replaced, opts);
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
interface Asset {
  from: string;
  to: string;
  /** Transform asset contents */
  transform?: (source: string) => string;
  /**
   * Encoding used for reading asset to pass to transform.
   * Not relevant if `transform` is not provided.
   * Default: utf-8
   */
  encoding?: BufferEncoding;
}

interface AdditionalAssetsPluginOpts {
  assets: Asset[];
  watch?: boolean;
  ignored?: ChokidarMatcher | ChokidarMatcher[];
}

type AsyncFunc<I extends unknown[], R> = (...args: I) => Promise<R>;
/**
 * Returns a function that calls the `inner` function().
 * It waits for previous invokations of the function to finish
 * before running.
 */
function Queued<I extends unknown[], R>(
  inner: AsyncFunc<I, R>,
): AsyncFunc<I, R> {
  let queue = Promise.resolve() as Promise<R>;

  return async (...args) => {
    queue = queue.catch(() => {}).then(() => inner(...args));
    return await queue;
  };
}

function additionalAssets(opts: AdditionalAssetsPluginOpts): Plugin {
  return {
    name: "additionalAssets",
    setup(build) {
      let initialRun = true;

      const assets = opts.assets;
      const enableWatch = opts.watch ?? false;
      const outDir = build.initialOptions.outdir;
      if (outDir === undefined) {
        throw new Error("esbuild.options.outDir is not specified");
      }

      build.onEnd(async (_) => {
        if (!initialRun) return;
        initialRun = false;

        const srcBaseDir = build.initialOptions.absWorkingDir ?? "";

        const absoluteAssets = assets.map(({ from, to, ...misc }) => {
          const src = path.resolve(srcBaseDir, from);
          const dest = path.resolve(outDir, to);
          return { from: src, to: dest, ...misc };
        });
        const sources = absoluteAssets.map(({ from }) => from);

        for (const { to } of absoluteAssets) {
          const parent = path.resolve(to, "..");
          await fs.promises.mkdir(parent, { recursive: true });
        }

        const watcher = chokidarWatch(sources, {
          ...(opts.ignored !== undefined ? { ignored: opts.ignored } : {}),
        });

        // Make sure its callback is run only when previous callback finishes running. Single queued.
        watcher.on(
          "all",
          Queued(async (event, p) => {
            const asset = matchAssetEntry(absoluteAssets, p);
            const rel = path.relative(asset.from, p);
            const dest = path.resolve(asset.to, rel);

            if (event === "addDir") {
              await fs.promises.mkdir(dest);
            } else if (event === "unlinkDir") {
              await fs.promises.rmdir(dest);
            } else if (event === "unlink") {
              await fs.promises.rm(dest);
            } else if (event === "add" || event === "change") {
              if (asset.transform) {
                const source = await fs.promises.readFile(p, {
                  encoding: asset.encoding,
                });
                const transformed = asset.transform(source.toString());
                await fs.promises.writeFile(dest, transformed);
              } else {
                await fs.promises.copyFile(
                  p,
                  dest,
                  // create copy-on-write reflink if such mechanism is supported in OS
                  fs.constants.COPYFILE_FICLONE,
                );
              }
            }
          }),
        );

        watcher.on("error", (err) => {
          console.error(
            // eslint-disable-next-line
            `[additional-assets] error occured with chokidar: ${err}`,
          );
        });

        watcher.on("ready", async () => {
          if (enableWatch) {
            console.log(
              "[additional-assets] Watching changes to additional assets...",
            );
          } else {
            await watcher.close();
          }
        });
      });
    },
  };

  /** Find first asset entry that matches path. Throw error if none matched. */
  function matchAssetEntry(absoluteAssets: Asset[], p: string): Asset {
    for (const asset of absoluteAssets) {
      const { from } = asset;
      const relative = path.relative(from, p);
      if (!relative.startsWith("..") && !path.isAbsolute(relative)) {
        return asset;
      }
    }
    throw new Error(
      `[additional-assets] Could not match the modified file's path to any asset entry: ${p}`,
    );
  }
}

async function main() {
  const outdir = `build/${TARGET}`;
  const entryPointIds = entryPointsForTarget();

  const staticAssets: Asset[] = entryPointIds
    .filter(([group, name]) => {
      return !["contentScript", "background"].includes(
        ENTRY_POINTS[group][name].context ?? "page",
      );
    })
    .map(([group, name]) => ({
      from: `src/entryPoints/${group}/${name}/index.html`,
      to: `./res/${name}.html`,
    }));
  staticAssets.push({ from: "src/assets/static/", to: "./res/assets/static" });
  if (!FOR_IOSAPP && !FOR_ANDROID) {
    staticAssets.push({
      from: "src/manifest.json.ejs",
      to: "manifest.json",
      transform: (raw) => {
        return ejs.render(raw, {
          version: VERSION,
          chrome: FOR_CHROME,
          firefox: FOR_FIREFOX,
          safari_desktop: FOR_SAFARI_DESKTOP,
          desktop: FOR_DESKTOP,
          ios: FOR_IOS,
          v2: FOR_FIREFOX || FOR_SAFARI_DESKTOP,
        });
      },
    });
  }

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
      additionalAssets({
        assets: staticAssets,
        watch: WATCH,
        ignored: /(^|[/\\])\../,
      }),
    ],
  };

  cleanDirectory(outdir);

  const context = await esbuild.context(buildOptions);

  if (WATCH) {
    console.info("esbuild: Watching for changes to code..");
    await context.watch();
  } else {
    await context.rebuild();
    await context.dispose();
  }
}

void main();
