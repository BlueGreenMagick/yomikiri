import fs from "node:fs";
import path from "node:path";
import fetchMock from "jest-fetch-mock";

fetchMock.enableMocks();
fetchMock.mockIf(/^http:\/\/yomikiri\/.*$/, async (req) => {
  let p;
  const splitted = req.url.split("/");
  let fileName = splitted[splitted.length - 1];
  if (fileName === "yomikiri_rs_bg.wasm") {
    p = path.join(__dirname, "..", "..", "rust", "pkg", fileName);
  }

  const data = fs.readFileSync(p);
  return {
    body: data,
  };
});
