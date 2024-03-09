import * as child_process from "promisify-child-process";
import process from "node:process";
import os from "node:os";
import path from "node:path";
import which from "which";
import toml from "toml";
import fs from "node:fs";
import { getProjectLicenses } from "generate-license-file";

type LicensesMap = Map<string, string[]>;

function addLicenses(licensesMap: LicensesMap, names: string[], content: string) {
  const dependencies = licensesMap.get(content);
  if (dependencies !== undefined) {
    dependencies.push(...names);
  } else {
    licensesMap.set(content, [...names])
  }
}

function getShell(): string {
  if (process.platform == "win32") {
    return process.env.COMSPEC || "cmd.exe";
  }

  try {
    let shell = os.userInfo().shell;
    if (shell) {
      return shell;
    }
  } catch { }

  return process.env.SHELL || "/bin/sh";
}

async function runRustCommand() {
  const cargoPath = (await which("cargo")) as string;
  const { stdout } = await child_process.spawn(cargoPath, ["run"], {
    shell: getShell(),
    cwd: "./rust",
    stdio: ["pipe", "pipe", process.stderr],
    encoding: "utf-8",
    maxBuffer: 8 * 1024 * 1024,
  });
  return stdout as string;
}

function getRustLicenses(licensesMap: LicensesMap, licensesJSON: string) {
  const licenses = JSON.parse(licensesJSON);
  let disclaimers: string[] = [];
  for (const pack of licenses.third_party_libraries) {
    let name = `${pack.package_name}@${pack.package_version}`
    addLicenses(licensesMap, [name], pack.licenses[0].text)
  }
}

async function getPnpmLicenses(licensesMap: LicensesMap) {
  const packageJsonPath = path.join("..", "..", "package.json");
  const licenses = await getProjectLicenses(packageJsonPath);
  for (const license of licenses) {
    addLicenses(licensesMap, license.dependencies, license.content);
  }
}


interface TOMLResource {
  name: string;
  url?: string;
  version?: string;
  license: string;
  text: string;
  text_html?: boolean;
}

interface ManualTomlFile {
  res: TOMLResource[];
}

function getManualLicenses(licensesMap: LicensesMap) {
  const manualTomlPath = path.join(".", "res", "manual.toml");
  const manualToml = fs.readFileSync(manualTomlPath, {
    encoding: "utf-8",
  });
  const resources = toml.parse(manualToml) as ManualTomlFile;

  // remove existing license from licenses map
  for (const res of resources.res) {
    for (const [key, names] of licensesMap) {
      let i;
      while ((i = names.indexOf(res.name)) != -1) {
        names.splice(i, 1);
      }
    }
  }

  for (const res of resources.res) {
    let name = `${res.name}${res.version ? '@' + res.version : ''}`
    addLicenses(licensesMap, [name], res.text);
  }
}

function generateLicensesText(licensesMap: LicensesMap): string {
  let lines: string[] = []
  for (const [licenseText, names] of licensesMap) {
    lines.push(`Yomikiri uses following software${names.length > 1 ? 's' : ''}: ${names.join(", ")}`)
    lines.push('')
    lines.push('They contain following license notice:')
    lines.push('')
    lines.push(licenseText)
    lines.push('')
    lines.push('==================================================')
    lines.push('')
  }
  return lines.join('\n')
}

async function main() {
  const licensesMap: LicensesMap = new Map();

  await getPnpmLicenses(licensesMap);
  let rustOutput = await runRustCommand();
  await getRustLicenses(licensesMap, rustOutput);
  getManualLicenses(licensesMap);
  const disclaimer = generateLicensesText(licensesMap);
  console.log(disclaimer);
}

main();
