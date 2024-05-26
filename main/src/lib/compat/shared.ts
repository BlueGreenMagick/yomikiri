import { type Configuration } from "lib/config";
import type { Configuration_1 } from "./v1";
import type { Configuration_2 } from "./v2";
import type { AnkiNote } from "lib/anki";


export interface DeprecatedConfiguration {
  /** Deprecated in conf v3+ */
  "anki.template": AnkiNote | null;
}

/* Ensure that no keys overlap between Configuration and Deprecated Configuration */
type OverlappingKeys<A, B> = keyof A & keyof B
type NoOverlappingKeys<A, B> = OverlappingKeys<A, B> extends never ? object : { overlap: OverlappingKeys<A, B> };
const _checkOverlap: NoOverlappingKeys<Configuration, DeprecatedConfiguration> = {};


interface ConfigBase {
  config_version?: number | undefined
  version?: string | undefined
}

interface Configuration_New extends ConfigBase {
  config_version?: undefined
  version?: undefined
}

export type StoredConfig<C extends ConfigBase> = Partial<C> & Pick<C, "config_version" | "version">

interface Configurations { 0: Configuration_New, 1: Configuration_1, 2: Configuration_2, 3: Configuration }

export type CompatConfiguration = Configurations[keyof Configurations]
export type StoredCompatConfiguration = { [K in keyof Configurations]: StoredConfig<Configurations[K]> }[keyof Configurations]