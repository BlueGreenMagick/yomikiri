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
    Object.defineProperty(this, "stack", { enumerable: true, writable: true });
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

    if (err === undefined || err === null) {
      const err = new YomikiriError("Undefined error");
      return err;
    }

    // Parse an error-like object
    if (
      typeof err === "object" &&
      "message" in err &&
      typeof err.message === "string"
    ) {
      if (err instanceof Error && "cause" in err && err.cause !== undefined) {
        return YomikiriError.from(err.cause).context(err.message);
      }
      let out;
      if (
        "details" in err &&
        typeof err.details === "object" &&
        err.details !== null &&
        "length" in err.details &&
        typeof err.details.length === "number"
      ) {
        out = new YomikiriError(err.message, err.details as string[]);
      } else {
        out = new YomikiriError(err.message);
      }

      if ("stack" in err && typeof err.stack === "string") {
        out.stack = err.stack;
      }
      return out;
    }

    if (typeof err === "string") {
      return new YomikiriError(err);
    }

    console.error("Unparsible error object", err);
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

  logConsole(): void {
    console.error(`ERROR:
${this.details.join("\n- ")}

===Stack Trace===
${this.stack}`);
  }
}
