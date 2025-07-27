import { NonContentScriptFunction } from "@/features/extension";
import type { IBackend, SearchRequest, TokenizeRequest } from "../types/backend";
import type { IosBackendPage } from "./page/backend";

export class IosBackend implements IBackend {
  readonly type = "ios";

  private constructor(private page: IosBackendPage | null) {}

  static background(backendPage: IosBackendPage) {
    return new IosBackend(backendPage);
  }

  static page(backendPage: IosBackendPage) {
    return new IosBackend(backendPage);
  }

  static content() {
    return new IosBackend(null);
  }

  readonly tokenize = NonContentScriptFunction(
    "IosBackend.tokenize",
    ({ text, charAt }: TokenizeRequest) => {
      return this.page!.tokenize(text, charAt);
    },
  );

  readonly search = NonContentScriptFunction(
    "IosBackend.search",
    ({ term, charAt }: SearchRequest) => {
      return this.page!.search(term, charAt);
    },
  );

  readonly getDictMetadata = NonContentScriptFunction(
    "IosBackend.getDictMetadata",
    () => {
      return this.page!.getDictMetadata();
    },
  );
}
