// Defines build scripts.
// Run via scripts in package.json
import { Command } from "commander";
import { $, fs, path } from "zx";

const WASM_DIR = "./pkg";
const SWIFT_DIR = "./swift";
const APPLE_PROJECT_RUST_DIR = "../../safari/YomikiriTokenizer/rust";

const program = new Command();

program.name("yomikiri-backend-scripts");

program
  .command("build-wasm")
  .description("Build backend for wasm")
  .option("--release", "optimize for release", false)
  .action((opts) => buildWasm(opts));

program
  .command("build-ios")
  .description("Build backend for ios")
  .option("--release", "optimize for release", false)
  .action((opts) => buildIos(opts));

program
  .command("build-all")
  .description("Build backend for all targets")
  .option("--release", "optimize for release", false)
  .action((opts) => buildAll(opts));

program
  .command("clean")
  .description("Clean up directories")
  .action(() => cleanAllDirs());

async function buildWasm(opts) {
  const release = opts.release ?? false;

  if (release) {
    await cleanSubdir(WASM_DIR);
  }

  await $`wasm-pack build ${!release ? "--dev" : ""} --scope yomikiri --target web`;
}

async function buildIos(opts) {
  const release = opts.release ?? false;

  if (release) {
    console.log(`$ Cleaning '${SWIFT_DIR}' directory`);
    await cleanSubdir(SWIFT_DIR);
  }

  // Build library file. *.dylib file is created on Mac, *.so file is created on linux.
  console.log("$ Building crate as lib");
  await $`cargo build --lib ${release ? "--release" : ""}`;

  let libPath = null;

  for (const ext of ["dylib", "so"]) {
    const lp = `../../target/${release ? "release" : "debug"}/libyomikiri_rs.${ext}`;
    const fullPath = path.resolve(process.cwd(), lp);
    if (fs.exists(fullPath)) {
      libPath = lp;
      break;
    }
  }

  if (libPath === null) {
    throw new Error(
      "Could not find lib file 'libyomikiri_rs.dylib' or 'libyomikiri_rs.so'",
    );
  }

  console.log("$ Creating uniffi-bindgen");
  // create uniffi bindings
  await $`cargo run --features \"uniffi/cli uniffi-bindgen\" --bin uniffi-bindgen generate --language swift --library ${libPath} --out-dir ${SWIFT_DIR}`;

  if (release) {
    console.log(`$ Cleaning '${APPLE_PROJECT_RUST_DIR}'`);
    await cleanSubdir(APPLE_PROJECT_RUST_DIR);
  }

  console.log(
    `$ Copying files from '${SWIFT_DIR}' to '${APPLE_PROJECT_RUST_DIR}'`,
  );
  await fs.copy(SWIFT_DIR, APPLE_PROJECT_RUST_DIR);

  const { stdout: rustTargets } = await $`rustup show`;

  if (rustTargets.includes("aarch64-apple-ios")) {
    console.log("$ Building backend for ios");
    await $`cargo build ${release ? "--release" : ""} --lib --target aarch64-apple-ios`;
  } else {
    throw new Error(
      "Could not build backend for ios because 'aarch64-apple-ios' was not found in installed target. " +
        "Run 'rustup target add aarch64-apple-ios' to build backend for ios.",
    );
  }
  if (rustTargets.includes("aarch64-apple-ios-sim")) {
    console.log("$ Building backend for ios simulator");
    await $`cargo build ${release ? "--release" : ""} --lib --target aarch64-apple-ios-sim`;
  } else {
    console.log(
      "$ 'aarch64-apple-ios-sim' not found in installed target. " +
        "Skipping build for ios simulator. " +
        "Run 'rustup target add aarch64-apple-ios-sim' to build backend for ios simulator.",
    );
  }
}

async function buildAll(opts) {
  await buildWasm(opts);
  await buildIos(opts);
}

async function cleanAllDirs() {
  cleanSubdir(WASM_DIR);
  cleanSubdir(SWIFT_DIR);
  cleanSubdir(APPLE_PROJECT_RUST_DIR);
}

async function cleanSubdir(relpath) {
  let dir = path.join(process.cwd(), relpath);
  await fs.remove(dir);
}

program.parse();
