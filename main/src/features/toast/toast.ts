import { TOASTER_ZINDEX } from "consts";
import toast, { type Renderable, type ToastOptions } from "svelte-french-toast";
import { YomikiriError } from "../error";
import DetailedToast from "./DetailedToast.svelte";
import Toasts from "./Toasts.svelte";

type ToastType = "success" | "error" | "loading";

export class Toast {
  toasts?: Toasts;
  private recentErrorToasts = new Map<string, number>();

  private maybeSetupToaster() {
    if (this.toasts === undefined) {
      this.setupToaster();
    }
  }

  /** Setup toaster in shadowDOM so it is not affected by existing document style */
  private setupToaster(): void {
    const container = document.createElement("div");
    container.style.cssText =
      "pointerEvents: none !important; background: none !important; border: none !important; position: fixed !important;";
    container.style.zIndex = `${TOASTER_ZINDEX}`;

    container.attachShadow({ mode: "open" });
    const root = container.shadowRoot;
    if (root === null) throw Error("Could not access shadow DOM of toaster");
    const innerContainer = document.createElement("div");
    root.appendChild(innerContainer);
    this.toasts = new Toasts({ target: innerContainer, props: {} });
    document.body.appendChild(container);
  }

  success(
    message: string,
    details?: string,
    opts: ToastOptions = {},
  ): ToastItem {
    this.maybeSetupToaster();
    return new ToastItem("success", DetailedToast, {
      ...opts,
      props: { message, details, ...opts.props },
    });
  }

  /** Error toasts with identical message and details are throttled to show every 1 second. */
  error(message: string, details?: string, opts: ToastOptions = {}): ToastItem | null {
    const key = `${message} |\u001F| ${details || ""}`;
    const now = Date.now();
    const lastToast = this.recentErrorToasts.get(key);

    if (lastToast && now - lastToast < 1000) {
      return null;
    }

    this.recentErrorToasts.set(key, now);
    setTimeout(() => {
      this.recentErrorToasts.delete(key);
    }, 1000);

    this.maybeSetupToaster();
    return new ToastItem("error", DetailedToast, {
      ...opts,
      props: { message, details, ...opts.props },
    });
  }

  loading(
    message: string,
    details?: string,
    opts: ToastOptions = {},
  ): ToastItem {
    this.maybeSetupToaster();
    return new ToastItem("error", DetailedToast, {
      ...opts,
      props: { message, details, ...opts.props },
    });
  }

  yomikiriError(err: YomikiriError): ToastItem | null {
    return this.error(err.message, err.details.slice(1).join("\n"));
  }

  custom<T extends Record<string, unknown> = Record<string, unknown>>(
    type: ToastType,
    message: Renderable<T>,
    opts: Partial<ToastOptions> = {},
  ) {
    this.maybeSetupToaster();
    return new ToastItem(type, message, opts);
  }
}

/** Do not directly call the constructor. Toasts should be created from ToastFactory instead. */
export class ToastItem<
  T extends Record<string, unknown> = Record<string, unknown>,
> {
  id: string;
  type: ToastType;
  message: Renderable<T>;
  opts: Partial<ToastOptions>;

  constructor(
    type: ToastType,
    message: Renderable<T>,
    opts: Partial<ToastOptions> = {},
  ) {
    this.type = type;
    this.message = message;
    this.opts = {
      ...opts,
      props: {
        ...opts.props,
        toast: this,
      },
    };

    this.id = createToast(type, message, this.opts);
  }

  update({
    type,
    message,
    opts,
  }: {
    type?: ToastType;
    message?: Renderable<T>;
    opts?: Partial<ToastOptions>;
  }) {
    this.type = type ?? this.type;
    this.message = message ?? this.message;
    this.opts = { ...this.opts, ...opts };

    this.id = createToast(this.type, this.message, {
      ...this.opts,
      id: this.id,
    });
  }

  dismiss() {
    toast.dismiss(this.id);
  }
}

/**
 * Creates toast, and returns its id.
 * If 'id' is given in `opts`, updates toast instead.
 */
function createToast<
  T extends Record<string, unknown> = Record<string, unknown>,
>(type: ToastType, message: Renderable<T>, opts: ToastOptions): string {
  if (type === "success") {
    return toast.success(message, {
      duration: 1500,
      ...opts,
    });
  } else if (type === "error") {
    return toast.error(message, {
      duration: 5000,
      ...opts,
    });
  } else if (type === "loading") {
    return toast.error(message, {
      duration: 8000,
      ...opts,
    });
  } else {
    throw new YomikiriError(`Invalid toast type: ${type}`);
  }
}
