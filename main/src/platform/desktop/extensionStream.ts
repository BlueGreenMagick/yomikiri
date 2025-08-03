import type { ExtensionStream, StreamByKey } from "@/features/extension";
import { startExtensionStream } from "@/features/extension/stream";
import type { ProgressTask } from "@/features/utils";

export type DesktopExtensionStream = ExtensionStream<
  "DesktopBackend.updateDictionary",
  boolean,
  string
>;

type Keys = DesktopExtensionStream["key"];

type ByKey<K extends Keys> = StreamByKey<DesktopExtensionStream, K>;

export function startDesktopExtensionStream<K extends Keys>(
  key: K,
  initialProgress: ByKey<K>["progress"],
): ProgressTask<ByKey<K>["success"], ByKey<K>["progress"]> {
  return startExtensionStream<ByKey<K>>(key, initialProgress);
}
