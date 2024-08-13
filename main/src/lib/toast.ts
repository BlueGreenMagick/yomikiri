import Toasts from "components/toast/Toasts.svelte";
import toast, { type ToastOptions } from "svelte-french-toast";
import Config from "./config";
import DetailedToast from "components/toast/DetailedToast.svelte";

type ToastType = "success" | "error" | "loading";

interface ToastParams {
  type: ToastType;
  msg: string;
  details?: string | undefined;
  opts?: Partial<ToastOptions> | undefined;
}

export class Toast {
  static toasts?: Toasts;
  id: string;
  type: ToastType;
  msg: string;
  details: string;
  opts: Partial<ToastOptions>;

  constructor({ type, msg, details: detailsArg, opts: optsArg }: ToastParams) {
    Toast.maybeSetupToaster();
    this.type = type;
    this.msg = msg;
    const details = detailsArg ?? "";
    const opts = optsArg ?? {};
    this.details = details;
    this.opts = opts;

    this.id = createToast(type, {
      ...opts,
      props: {
        msg,
        details,
        ...opts?.props,
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

  static success(msg: string, details?: string): Toast {
    return new Toast({ type: "success", msg, details });
  }

  static error(msg: string, details?: string): Toast {
    return new Toast({ type: "error", msg, details });
  }

  static loading(msg: string, details?: string): Toast {
    return new Toast({ type: "loading", msg, details });
  }

  update({ type, msg, details, opts }: Partial<ToastParams>) {
    this.type = type ?? this.type;
    this.msg = msg ?? this.msg;
    this.details = details ?? this.details;
    this.opts = opts ?? this.opts;

    createToast(this.type, {
      ...opts,
      id: this.id,
      props: {
        msg: this.msg,
        details: this.details,
        ...opts?.props,
      },
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
function createToast(type: ToastType, opts: ToastOptions): string {
  if (type === "success") {
    return toast.success(DetailedToast, {
      duration: 1500,
      ...opts,
    });
  } else if (type === "error") {
    return toast.error(DetailedToast, {
      duration: 5000,
      ...opts,
    });
  } else if (type === "loading") {
    return toast.error(DetailedToast, {
      duration: 8000,
      ...opts,
    });
  } else {
    throw new Error(`Invalid toast type: ${type}`);
  }
}

window.toast = Toast;
