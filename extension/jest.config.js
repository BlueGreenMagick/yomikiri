export default {
  transform: {
    "\\.(t|j|mj)sx?$": "@swc/jest",
    "\\.gz$": "<rootDir>/scripts/jestFileTransformer.js",
  },
  moduleNameMapper: {
    "^~/(.*)$": "<rootDir>/src/$1",
    "^@icons/(.*)$": "<rootDir>/src/assets/icons/$1",
    "^@platform$": "<rootDir>/src/platform/desktop/index",
    "^@platform/(.*)$": "<rootDir>/src/platform/desktop/$1",
    "^@yomikiri/yomikiri-rs$":
      "<rootDir>/../node_modules/@yomikiri/yomikiri-rs/yomikiri_rs.js",
  },
  testEnvironment: "<rootDir>/scripts/jestEnvironment.js",
  testEnvironmentOptions: {
    url: "https://yomikiri.jest/",
    html: "<!DOCTYPE html><html><head></head><body></body></html>",
  },
  setupFiles: ["<rootDir>/scripts/jestSetup.js"],
  transformIgnorePatterns: ["node_modules/(?!dexie)/"],
};
