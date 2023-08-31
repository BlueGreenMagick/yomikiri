// from https://jestjs.io/docs/code-transformation#transforming-images-to-their-path
"use strict";

import path from "node:path";

export default {
  process(sourceText, sourcePath, options) {
    return {
      code: ` module.exports = ${JSON.stringify(
        "http://yomikiri/" + path.basename(sourcePath)
      )};`,
    };
  },
};
