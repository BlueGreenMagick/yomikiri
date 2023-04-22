import esbuild from "esbuild";
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url';
import { exec } from 'node:child_process'
import { wasmLoader } from 'esbuild-plugin-wasm';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const development = process.env.NODE_ENV === "development";
const production = process.env.NODE_ENV === "production";

const buildOptions = {
  entryPoints: ["src/index.ts"],
  outfile: "dist/tokenizer.js",
  target: "esnext",
  format: "esm",
  bundle: true,
  plugins: [
    wasmLoader({
      mode: "embedded"
    })
  ]
};

const serveOptions = {
  servedir: ".",
};


const ctx = await esbuild.context(buildOptions);

await ctx.rebuild()

if (!development) {
  ctx.dispose()
} else {
  await ctx.watch()

  // watch and rebuild rust wasm
  fs.watch(
    path.join(__dirname, "lindera-wasm/src"), 
    { recursive: true },
    (eventType, fileName) => {
      console.log("building wasm")
      const result = exec("yarn build:wasm");
      console.log(result.stdout);
      ctx.rebuild();
    }
  );

  let { host, port } = await ctx.serve(serveOptions);
  console.log(`esbuild: Serving at http://${host}:${port}/dev`);
  console.log("esbuild: Watching for changes to code...");
}