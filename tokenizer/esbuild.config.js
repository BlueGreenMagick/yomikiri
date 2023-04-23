import esbuild from "esbuild";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import { wasmLoader } from "esbuild-plugin-wasm";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const development = process.env.NODE_ENV === "development";
const production = process.env.NODE_ENV === "production";

const buildOptions = {
  entryPoints: [
    { in: "src/index.ts", out: "tokenizer" },
    { in: "public/index.html", out: "index" },
  ],
  outdir: "dist",
  target: "esnext",
  format: "esm",
  bundle: true,
  loader: { ".wasm": "file", ".html": "copy" },
};

const serveOptions = {
  servedir: "dist",
};

const ctx = await esbuild.context(buildOptions);

await ctx.rebuild();

if (!development) {
  ctx.dispose();
} else {
  await ctx.watch();

  fs.watch(
    path.join(__dirname, "lindera-wasm/src"),
    { recursive: true },
    (eventType, fileName) => {
      console.info("building wasm.....");
      const result = execSync("yarn build:wasm");
      console.log(result.stdout);
      console.log("rebuilding ts.....");
      ctx.rebuild();
      console.log("ts rebuilt!");
    }
  );

  let { host, port } = await ctx.serve(serveOptions);
  console.log(`esbuild: Serving at http://${host}:${port}`);
  console.log("esbuild: Watching for changes to code...");
}
