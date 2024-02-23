import child_process from "node:child_process";
import process from "node:process";
import os from "node:os";
import path from "node:path";

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

function runRustComand() {
  child_process.exec("cargo run -- -o 'abc.json'", {
    shell: getShell(),
    cwd: path.join(process.cwd(), "rust"),
  });
}

runRustComand();
