import type { StoredConfiguration } from "~/config";

export interface Module {
  IS_DESKTOP: boolean;
  IS_IOS: boolean;
  IS_IOSAPP: boolean;

  loadConfig: () => Promise<StoredConfiguration>;
  saveConfig: (config: StoredConfiguration) => Promise<void>;
  openOptionsPage: () => void | Promise<void>;
  /** Api must be initialized */
  initialize: () => void;
  versionInfo: () => Promise<VersionInfo>;
}

export interface VersionInfo {
  version: string
}