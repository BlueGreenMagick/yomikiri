import { CONFIG_VERSION, type StoredConfiguration } from "@/lib/config";
import { DesktopPlatform } from "@/platform/desktop";

type ConfigSubscriber = (config: StoredConfiguration) => void;

/* Mock config */
let storedConfig: StoredConfiguration = {
  version: "0.0.1",
  config_version: CONFIG_VERSION,
};

const subscribers: ConfigSubscriber[] = [];

DesktopPlatform.getConfig = () => {
  return Promise.resolve(storedConfig);
};
DesktopPlatform.saveConfig = (conf) => {
  storedConfig = conf;
  for (const subscriber of subscribers) {
    subscriber(storedConfig);
  }
  return Promise.resolve();
};
DesktopPlatform.subscribeConfig = (subscriber: ConfigSubscriber) => {
  subscribers.push(subscriber);
};

export function setStoredConfig(conf: StoredConfiguration) {
  storedConfig = conf;
}
