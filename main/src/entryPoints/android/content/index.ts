/** Secret key used in android message handler */
declare const __ANDROID_MESSAGE_SECRET_KEY: string;

import "./other";

declare global {
  interface Window {
    __yomikiriInterface?: {
      postMessage: PostMessageFn;
    };
  }
}

type PostMessageFn = (message: string) => string | null;

console.log("hello world from content js!");

let capturedHandler: PostMessageFn = () => {
  throw new Error("Could not capture js interface");
};

if (Object.prototype.hasOwnProperty.call(window, "__yomikiriInterface")) {
  capturedHandler = window.__yomikiriInterface!.postMessage.bind(
    window.__yomikiriInterface,
  );
  delete window["__yomikiriInterface"];
}

capturedHandler("Message sent from content js");
