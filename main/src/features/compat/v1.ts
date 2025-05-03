import { type Configuration } from "@/features/config";
import type { DeprecatedConfiguration, StoredConfig } from "./shared";
import type { Configuration_2 } from "./v2";

/**
 * v0.1.0 - 0.1.3
 * In these versions, 'config_version' did not exist yet.
 */
export type Configuration_1_Conf = Pick<
  Configuration,
  | "state.enabled"
  | "general.font_size"
  | "general.font"
  | "anki.connect_port"
  | "anki.connect_url"
  | "anki.enabled"
  | "anki.ios_auto_redirect"
  | "tts.voice"
  | "version"
> &
  Pick<DeprecatedConfiguration, "anki.template">;

export type Configuration_1 = Configuration_1_Conf & {
  config_version?: undefined;
};

export function migrateConfiguration_1(
  config: StoredConfig<Configuration_1>,
): StoredConfig<Configuration_2> {
  return {
    ...config,
    config_version: 2,
  };
}
