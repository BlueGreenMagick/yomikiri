import type { RunAppCommandKeys, RunAppCommandOf, RunAppReturnType } from "../shared/runApp";
import type {
  DictionaryMetadata,
  IBackend,
  SearchRequest,
  TokenizeRequest,
  TokenizeResult,
} from "../types/backend";
import { sendIosExtensionMessage } from "./extensionMessage";
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

  tokenize(req: TokenizeRequest): Promise<TokenizeResult> {
    if (this.page) {
      return this.page.tokenize(req.text, req.charAt);
    } else {
      return sendIosExtensionMessage("IosBackend.tokenize", req);
    }
  }

  search(req: SearchRequest): Promise<TokenizeResult> {
    if (this.page) {
      return this.page.search(req.term, req.charAt);
    } else {
      return sendIosExtensionMessage("IosBackend.search", req);
    }
  }

  getDictMetadata(): Promise<DictionaryMetadata> {
    if (this.page) {
      return this.page.getDictMetadata();
    } else {
      return sendIosExtensionMessage("IosBackend.getDictMetadata", undefined);
    }
  }

  async runApp<C extends RunAppCommandKeys>(req: RunAppCommandOf<C>): Promise<RunAppReturnType<C>> {
    if (this.page) {
      return await this.page.runApp(req);
    } else {
      return await sendIosExtensionMessage("IosBackend.runApp", req) as RunAppReturnType<
        C
      >;
    }
  }
}
