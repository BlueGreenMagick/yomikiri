import type { Module } from "../types";

export namespace Platform {
  export const IS_DESKTOP = false;
  export const IS_IOS = true;
}

Platform satisfies Module;
