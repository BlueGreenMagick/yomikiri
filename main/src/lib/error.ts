import { BackendError } from "@yomikiri/yomikiri-rs";

/**
 * Immutable error type with chain of cause.
 */
export class YomikiriError extends Error {
  readonly message: string;
  /** contains message as first element, and leaf error message as last. */
  readonly details: string[];

  constructor(message: string, details?: string[]) {
    super();
    Object.defineProperty(this, "stack", { enumerable: true });
    this.message = message;
    this.details = details ?? [message];
  }

  /**
   * Creates a YomikiriError from an unknown err.
   * If err is YomikiriError, returns itself.
   */
  static from(err: unknown): YomikiriError {
    if (err instanceof YomikiriError) return err;

    if (err instanceof BackendError) {
      return new YomikiriError(err.message, err.details);
    }

    if (err instanceof Error) {
      // create details from chain of causes
      if ((err as Error & { cause: unknown }).cause !== undefined) {
        return YomikiriError.from(
          (err as Error & { cause: unknown }).cause,
        ).context(err.message);
      } else {
        const out = new YomikiriError(err.message);
        if ("stack" in err) {
          out.stack = err.stack;
        }
      }
    }

    if (err === undefined || err === null) {
      const err = new YomikiriError("Undefined error");
      return err;
    }

    if (typeof err === "string") {
      return new YomikiriError(err);
    }

    console.error(err);
    try {
      // eslint-disable-next-line
      const msg = err.toString();
      return new YomikiriError(`Unknown error: ${msg}`);
    } catch {
      return new YomikiriError(
        "Unknown error. Check the browser console for more details.",
      );
    }
  }

  context(message: string): YomikiriError {
    const details = [message, ...this.details];
    const err = new YomikiriError(message, details);
    if ("stack" in this) {
      err.stack = this.stack;
    }
    return err;
  }
}
