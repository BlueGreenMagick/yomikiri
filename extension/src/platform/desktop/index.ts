import type { Module } from "../types";

export namespace Platform {
  export const IS_DESKTOP = true;
  export const IS_IOS = false;
}

Platform satisfies Module;
