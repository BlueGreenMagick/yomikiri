import fs from "node:fs";
import path from "node:path";
import pako from "pako";

const WASM_NAME = "yomikiri_rs_bg";
const __dirname = new URL(".", import.meta.url).pathname;
const PKG_DIR = path.join(__dirname, "pkg");

let input = path.join(PKG_DIR, `${WASM_NAME}.wasm`);
let output_file = path.join(PKG_DIR, `${WASM_NAME}.wasm.gz`);

let read = fs.readFileSync(input);
let compressed = pako.deflate(read);
fs.writeFileSync(output_file, compressed);

const input_types = path.join(PKG_DIR, `${WASM_NAME}.wasm.d.ts`);
const output_types = path.join(PKG_DIR, `${WASM_NAME}.wasm.gz.d.ts`);
fs.copyFileSync(input_types, output_types);
