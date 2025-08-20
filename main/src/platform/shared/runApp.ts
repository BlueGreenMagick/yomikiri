import type { RunAppCommand, RunAppReturn } from "@yomikiri/backend-uniffi-bindings";

export type RunAppCommandKeys = RunAppCommand["cmd"];

export type RunAppCommandOf<C extends RunAppCommandKeys> = Extract<RunAppCommand, { cmd: C }>;

export type RunAppArgType<C extends RunAppCommandKeys> = RunAppCommandOf<C>["args"];

export type RunAppReturnType<C extends RunAppCommandKeys> = Extract<
  RunAppReturn,
  { cmd: C }
>["value"];
