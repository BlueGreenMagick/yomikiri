import type { TokenizeRequest } from "~/tokenizer";
import { Platform } from ".";
import type { IBackendStatic, IBackend, Token } from "../types/backend";

export type { Token } from "../types/backend";

export class Backend implements IBackend {
  static async initialize(): Promise<Backend> {
    return new Backend();
  }

  async tokenize(text: string, charIdx: number): Promise<Token[]> {
    let req: TokenizeRequest = { text, charIdx };
    return await Platform.requestToApp("tokenize", req);
  }
}

Backend satisfies IBackendStatic;
