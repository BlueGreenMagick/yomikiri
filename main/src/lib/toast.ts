import Toasts from "components/toast/Toasts.svelte";
import toast, { type ToastOptions, type Renderable } from "svelte-french-toast";
import Config from "./config";
import DetailedToast from "components/toast/DetailedToast.svelte";

type ToastType = "success" | "error" | "loading";

export class Toast<
  T extends Record<string, unknown> = Record<string, unknown>,
> {
  static toasts?: Toasts;
  id: string;
  type: ToastType;
  message: Renderable<T>;
  opts: Partial<ToastOptions>;

  constructor(
    type: ToastType,
    message: Renderable<T>,
    opts: Partial<ToastOptions> = {},
  ) {
    Toast.maybeSetupToaster();
    this.type = type;
    this.message = message;
    this.opts = opts;

    this.id = createToast(type, message, {
      ...opts,
      props: {
        ...opts.props,
        toast: this,
      },
    });
  }

  /** Setup toaster in shadowDOM so it is not affected by existing document style */
  private static setupToaster(): void {
    const container = document.createElement("div");
    container.style.cssText =
      "pointerEvents: none !important; background: none !important; border: none !important;";

    container.attachShadow({ mode: "open" });
    const root = container.shadowRoot;
    if (root === null) throw Error("Could not access shadow DOM of toaster");
    const innerContainer = document.createElement("div");
    root.appendChild(innerContainer);
    void Config.instance.get().then((c) => {
      c.setStyle(root);
    });
    Toast.toasts = new Toasts({ target: innerContainer, props: {} });
    document.body.appendChild(container);
  }

  private static maybeSetupToaster() {
    if (Toast.toasts === undefined) {
      Toast.setupToaster();
    }
  }

  static success(
    message: string,
    details?: string,
    opts: ToastOptions = {},
  ): Toast {
    return new Toast("success", DetailedToast, {
      ...opts,
      props: { message, details, ...opts.props },
    });
  }

  static error(
    message: string,
    details?: string,
    opts: ToastOptions = {},
  ): Toast {
    return new Toast("error", DetailedToast, {
      ...opts,
      props: { message, details, ...opts.props },
    });
  }

  static loading(
    message: string,
    details?: string,
    opts: ToastOptions = {},
  ): Toast {
    return new Toast("error", DetailedToast, {
      ...opts,
      props: { message, details, ...opts.props },
    });
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
      ...opts,
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
    throw new Error(`Invalid toast type: ${type}`);
  }
}

window.toast = Toast;
