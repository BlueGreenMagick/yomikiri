import { fs, echo } from "zx";

const packageJson = fs.readFileSync("./package.json", { encoding: "utf-8" });
const pack = JSON.parse(packageJson) as { version: string };
const version = pack.version;

echo(version);
