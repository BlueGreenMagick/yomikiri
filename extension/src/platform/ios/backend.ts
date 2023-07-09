import { Platform } from ".";
import type { IBackendStatic, IBackend, Token } from "../types/backend";

export type { Token } from "../types/backend";

export class Backend implements IBackend {
  static async initialize(): Promise<Backend> {
    return new Backend();
  }

  async tokenize(text: string): Promise<Token[]> {
    return await Platform.requestToApp("tokenize", text);
  }
}

Backend satisfies IBackendStatic;
