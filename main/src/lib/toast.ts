import DelayedToastIcon from "components/toast/ToastIcon.svelte";
import toast, { Toaster, type ToastOptions } from "svelte-french-toast";

const optsLoading = {
  duration: 8000,
};

const optsSuccess = {
  duration: 1500,
};

const optsError = {
  duration: 3000,
};

export class Toast {
  static toaster?: Toaster;
  id: string;

  private constructor(id: string) {
    this.id = id;
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

    Toast.toaster = new Toaster({ target: innerContainer, props: {} });
    document.body.appendChild(container);
  }

  private static maybeSetupToaster() {
    if (Toast.toaster === undefined) {
      Toast.setupToaster();
    }
  }

  static loading(msg: string): Toast {
    Toast.maybeSetupToaster();
    const id = toast.loading(msg, optsLoading);
    return new Toast(id);
  }

  /** Toast is deleted after delay */
  static success(msg: string, opts?: ToastOptions): Toast {
    Toast.maybeSetupToaster();
    const builtOpts = {
      ...optsSuccess,
      ...(opts ?? {}),
    };
    const id = toast.success(msg, builtOpts);
    return new Toast(id);
  }

  /** Toast is deleted after delay */
  static error(msg: string): Toast {
    Toast.maybeSetupToaster();
    const id = toast.error(msg, optsError);
    return new Toast(id);
  }

  update(msg: string) {
    toast.loading(msg, { ...optsLoading, id: this.id });
  }

  success(msg: string) {
    toast.success(msg, { ...optsSuccess, id: this.id });
  }

  error(msg: string) {
    toast.error(msg, { ...optsError, id: this.id });
  }

  dismiss() {
    toast.dismiss(this.id);
  }
}
