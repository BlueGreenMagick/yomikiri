import type { StreamByKey } from "@/features/extension";
import { startExtensionStream } from "@/features/extension/stream";
import type { DeferredWithProgress } from "@/features/utils";

export type IosExtensionStream = never;

type Keys = IosExtensionStream["key"];

type ByKey<K extends Keys> = StreamByKey<IosExtensionStream, K>;

export function startIosExtensionStream<K extends Keys>(
  key: K,
  initialProgress: ByKey<K>["progress"],
): DeferredWithProgress<ByKey<K>["success"], ByKey<K>["progress"]> {
  return startExtensionStream<ByKey<K>>(key, initialProgress);
}
