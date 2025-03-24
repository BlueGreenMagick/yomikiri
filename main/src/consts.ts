export const VERSION = __APP_VERSION__;

export const PLATFORM = self.YOMIKIRI_ENV.APP_PLATFORM;
/** If in non-extension platform, defaults to 'page' */
export const EXTENSION_CONTEXT = self.YOMIKIRI_ENV.EXTENSION_CONTEXT;

export const TOOLTIP_IFRAME_ID = "yomikiri-addon-dictionary-tooltip";

/** z-index */
export const TOOLTIP_ZINDEX = 1900000000;
export const TOASTER_ZINDEX = 2000000000;
