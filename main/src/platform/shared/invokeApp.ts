import type { AppCommand, AppCommandResultSpec } from "@yomikiri/backend-uniffi-bindings";

export type { AppCommand } from "@yomikiri/backend-uniffi-bindings";

export type AppCommandTypes = AppCommand["type"];

export type AppCommandOf<C extends AppCommandTypes> = Extract<AppCommand, { type: C }>;

export type AppCommandArgOf<C extends AppCommandTypes> = AppCommandOf<C>["args"];

export type AppCommandResult = AppCommandResultSpec["result"];

export type AppCommandResultOf<C extends AppCommandTypes> = Extract<
  AppCommandResultSpec,
  { type: C }
>["result"];
