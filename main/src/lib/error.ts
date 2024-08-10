/**
 * Immutable error type with chain of cause.
 */
export class YomikiriError {
  readonly message: string;
  /** contains message as first element, and leaf error message as last. */
  readonly details: string[];

  constructor(message: string, details?: string[]) {
    this.message = message;
    this.details = details ?? [message];
  }

  /**
   * Creates a YomikiriError from an unknown err.
   * If err is YomikiriError, returns itself.
   */
  static from(err: unknown): YomikiriError {
    if (err instanceof YomikiriError) return err;

    if (err === undefined || err === null) {
      return new YomikiriError("Undefined error");
    }

    if (err instanceof Error) {
      // create details from chain of causes
      if ((err as Error & { cause: unknown }).cause !== undefined) {
        return YomikiriError.from(
          (err as Error & { cause: unknown }).cause,
        ).context(err.message);
      } else {
        return new YomikiriError(err.message);
      }
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
    return new YomikiriError(message, details);
  }
}
