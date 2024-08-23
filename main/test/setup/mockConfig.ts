import { CONFIG_VERSION, type StoredConfiguration } from "lib/config";
import { DesktopPlatform } from "platform/desktop";

/* Mock config */
let storedConfig: StoredConfiguration = {
  version: "0.0.1",
  config_version: CONFIG_VERSION,
};

DesktopPlatform.getConfig = () => {
  return Promise.resolve(storedConfig);
};
DesktopPlatform.saveConfig = (conf) => {
  storedConfig = conf;
  return Promise.resolve();
};

export function setStoredConfig(conf: StoredConfiguration) {
  storedConfig = conf;
}
