` /main`: Contains the main frontend code.
  - `/main/src/iosapp`: Code for ios app webview.
  - `/main/src/extension`: Code used in extension context. Code outside this directory are considered code that can be called in `iosapp` and should not import code in this directory.
  - `/main/src/platform`: Platform-specific code.