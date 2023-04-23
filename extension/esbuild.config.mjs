import esbuild from "esbuild";
import { copy } from "esbuild-plugin-copy";

const DEVELOPMENT = process.env.NODE_ENV === "development";
const PRODUCTION = process.env.NODE_ENV === "production";

const setWatchOptionPlugin = {
  name: "setWatchOptionPlugin",
  setup(build) {
    if (DEVELOPMENT) {
      Object.defineProperty(build.initialOptions, "watch", {
        get() {
          return true;
        }
      })
    }
  }
}

const logRebuildPlugin = {
  name: "logRebuildPlugin",
  setup(build) {
    build.onStart(() => {
      console.info("\n=====  esbuild: Build start  =====")
    })
    build.onEnd(() => {
      console.info("=====  esbuild: Build end  =====\n")
    })
  }
}


const buildOptions = {
  entryPoints: [
    { in: "src/tooltip/content/index.ts", out: "content/tooltip" },
    { in: "src/background/index.ts", out: "background" }
  ],
  outdir: "build",
  target: "es6",
  format: "esm",
  bundle: true,
  logLevel: "info",
  plugins: [
    logRebuildPlugin,
    setWatchOptionPlugin,
    copy({
      assets: [
        { from: ["images/**/*"], to: ["images"] },
        { from: ["src/**/*.html"], to: ["./"] },
        { from: ["src/**/*.json"], to: ["./"] },
      ],
      watch: true,
      verbose: true
    })
  ],
};

const serveOptions = {
  servedir: ".",
};


const ctx = await esbuild.context(buildOptions);

await ctx.rebuild()

if (!DEVELOPMENT) {
  ctx.dispose()
} else {
  console.info("esbuild: Watching for changes to code..");
  await ctx.watch()
}