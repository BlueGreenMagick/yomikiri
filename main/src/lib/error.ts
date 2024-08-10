/**
 * Immutable error type with chain of cause.
 */
export class YomikiriError {
  readonly message: string;
  /** contains message as first element, and leaf error message as last. */
  readonly details: string[];
  readonly stack: string[];

  constructor(message: string, stack: string[], details?: string[]) {
    this.message = message;
    this.details = details ?? [message];
    this.stack = stack ?? "";
  }

  /**
   * Creates a YomikiriError from an unknown err.
   * If err is YomikiriError, returns itself.
   */
  static from(err: unknown): YomikiriError {
    if (err instanceof YomikiriError) return err;

    if (err instanceof Error) {
      // create details from chain of causes
      if ((err as Error & { cause: unknown }).cause !== undefined) {
        return YomikiriError.from(
          (err as Error & { cause: unknown }).cause,
        ).context(err.message);
      } else {
        const stack = formatStack(err.stack ?? "");
        return new YomikiriError(err.message, stack, []);
      }
    }

    const tempErr = new Error();
    const currStack = formatStack(tempErr.stack ?? "");

    if (err === undefined || err === null) {
      const err = new YomikiriError("Undefined error", currStack);
      return err;
    }

    if (typeof err === "string") {
      return new YomikiriError(err, currStack);
    }

    console.error(err);
    try {
      // eslint-disable-next-line
      const msg = err.toString();
      return new YomikiriError(`Unknown error: ${msg}`, currStack);
    } catch {
      return new YomikiriError(
        "Unknown error. Check the browser console for more details.",
        currStack,
      );
    }
  }

  context(message: string): YomikiriError {
    const details = [message, ...this.details];
    return new YomikiriError(message, this.stack, details);
  }
}

function formatStack(stack: string): string[] {
  return stack.split("\n").map((line) => line.trim());
}
