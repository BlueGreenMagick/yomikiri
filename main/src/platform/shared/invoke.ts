import type { Command, CommandResultSpec } from "@yomikiri/backend-bindings";

export type { Command } from "@yomikiri/backend-bindings";

export type CommandTypes = Command["type"];

export type CommandOf<C extends CommandTypes> = Extract<Command, { type: C }>;

export type CommandArgOf<C extends CommandTypes> = CommandOf<C>["args"];

export type CommandResult = CommandResultSpec["result"];

export type CommandResultOf<C extends CommandTypes> = Extract<
  CommandResultSpec,
  { type: C }
>["result"];
