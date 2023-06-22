// from https://jestjs.io/docs/code-transformation#transforming-images-to-their-path
"use strict";

const path = require("path");

module.exports = {
  process(sourceText, sourcePath, options) {
    return {
      code: `module.exports = ${JSON.stringify(
        "http://yomikiri/" + path.basename(sourcePath)
      )};`,
    };
  },
};
