// https://github.com/jsdom/jsdom/issues/2524#issuecomment-1480930523
"use strict";

import { TextEncoder, TextDecoder } from "util";
import $JSDOMEnvironment, {
  TestEnvironment as JTestEnvironment,
} from "jest-environment-jsdom";

export default class JSDOMEnvironment extends $JSDOMEnvironment.default {
  constructor(...args) {
    const { global } = super(...args);
    if (!global.TextEncoder) global.TextEncoder = TextEncoder;
    if (!global.TextDecoder) global.TextDecoder = TextDecoder;
    if (!global.Uint8Array) global.Uint8Array = Uint8Array;
  }
}

export const TestEnvironment =
  JTestEnvironment === $JSDOMEnvironment ? JSDOMEnvironment : JTestEnvironment;
