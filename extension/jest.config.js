module.exports = {
  transform: {
    "^.+\\.(t|j)sx?$": "@swc/jest",
  },
  moduleNameMapper: {
    "^~/(.*)$": "./$1",
    "^@icons/(.*)$": "assets/icons/$1",
    "^@platform$": "platform/desktop/index",
    "^@platform/(.*)$": "platform/desktop/$1",
  },
  testEnvironment: "jsdom",
  testEnvironmentOptions: {
    url: "https://yomikiri.jest/",
    html: "<!DOCTYPE html><html><head></head><body></body></html>",
  },
  globals: {
    fetch: global.fetch,
  },
};
