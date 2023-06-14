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
};
