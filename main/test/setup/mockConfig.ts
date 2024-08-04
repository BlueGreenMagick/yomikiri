import type { StoredConfiguration } from "lib/config";
import { DesktopPlatform } from "platform/desktop";

/* Mock config */
let storedConfig: StoredConfiguration | Record<string, never> = {};

DesktopPlatform.getConfig = () => {
  return Promise.resolve(storedConfig);
};
DesktopPlatform.saveConfig = (conf) => {
  storedConfig = conf;
  return Promise.resolve();
};

export function setStoredConfig(
  conf: StoredConfiguration | Record<string, never>,
) {
  storedConfig = conf;
}
