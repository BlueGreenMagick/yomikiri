import * as child_process from "promisify-child-process";
import process from "node:process";
import os from "node:os";
import path from "node:path";
import which from "which";

function getShell(): string {
  if (process.platform == "win32") {
    return process.env.COMSPEC || "cmd.exe";
  }

  try {
    let shell = os.userInfo().shell;
    if (shell) {
      return shell;
    }
  } catch {}

  return process.env.SHELL || "/bin/sh";
}

async function runRustCommand() {
  // console.log("### cargo run:");
  const cargoPath = (await which("cargo")) as string;
  const { stdout } = await child_process.spawn(cargoPath, ["run"], {
    shell: getShell(),
    cwd: path.join(__dirname, "rust"),
    stdio: ["pipe", "pipe", process.stderr],
    encoding: "utf-8",
    maxBuffer: 8 * 1024 * 1024,
  });
  return stdout as string;
}

function formatRustDisclaimer(licensesJSON: string): string {
  const licenses = JSON.parse(licensesJSON);
  let disclaimers: string[] = [];
  for (const pack of licenses.third_party_libraries) {
    let disclaimer = `The following software may be included in this product: ${pack.package_name} (${pack.package_version}) with license (${pack.license}). This software contains the following license and notice below:`;
    disclaimer += "\n\n";
    for (const license of pack.licenses) {
      disclaimer += license.text;
      disclaimer += "\n\n";
    }
    disclaimers.push(disclaimer);
  }
  return disclaimers.join("\n");
}

async function generateYarnLicenses() {
  // console.log("### yarn licenses generate-disclaimer:");

  const yarnPath = (await which("yarn")) as string;
  const { stdout } = await child_process.spawn(
    yarnPath,
    ["licenses", "generate-disclaimer"],
    {
      shell: getShell(),
      cwd: path.join(__dirname, "..", "..", "extension"),
      stdio: ["pipe", "pipe", process.stderr],
      encoding: "utf-8",
      maxBuffer: 8 * 1024 * 1024,
      env: {
        NODE_ENV: "production",
      },
    }
  );
  return stdout as string;
}

async function main() {
  let disclaimer = await generateYarnLicenses();
  disclaimer += "\n-------------------------\n";
  let rustOutput = await runRustCommand();
  disclaimer += formatRustDisclaimer(rustOutput);
  console.log(disclaimer);
}

main();
