import fs from "node:fs";
import path from "node:path";
import fetchMock from "jest-fetch-mock";

fetchMock.enableMocks();
fetchMock.mockIf(/^http:\/\/yomikiri\/.*$/, async (req) => {
  let p;
  const splitted = req.url.split("/");
  let fileName = splitted[splitted.length - 1];
  if (fileName === "en.json.gz") {
    p = path.join(__dirname, "..", "src", "assets", "jmdict", fileName);
  } else if (fileName === "yomikiri_rs_bg.wasm.gz") {
    p = path.join(__dirname, "..", "..", "rust", "pkg", fileName);
  }
  // /Users/yoonchae/Code/yomikiri/yomikiri/rust/pkg/yomikiri_rs_bg.wasm.gz
  const data = fs.readFileSync(p);
  return {
    body: data,
    headers: {
      "Content-Type": "application/x-gzip",
    },
  };
});
