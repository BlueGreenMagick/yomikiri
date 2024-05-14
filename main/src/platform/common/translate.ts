import { hasOwnProperty } from "~/lib/utils";

interface GoogleTranslateApiResult {
  sentences: {
    trans: string,
    orig: string,
    backend: number
  }[],
  src: string,
  confidence: number,
  spell: unknown,
  ld_result: {
    srclangs: string[],
    srclangs_confidences: number[],
    extended_srclangs: string[]
  }
}



export interface TranslateResult {
  translated: string;
}

const translationCache: Record<string, TranslateResult> = {};

/**
 * This does not work in content scripts due to CORS.
 *
 * Use `BrowserApi.request("translate")` instead,
 */
export async function getTranslation(text: string): Promise<TranslateResult> {
  if (hasOwnProperty(translationCache, text)) {
    return translationCache[text];
  }

  const targetLang = "en";
  const encodedText = encodeURIComponent(text);

  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=ja&tl=${targetLang}&dt=t&dt=bd&dj=1&q=${encodedText}`;
  const response = await fetch(url);
  const respBody = await response.json(); // eslint-disable-line

  if (response.status !== 200) {
    console.error(respBody);
    throw respBody;
  } else {
    const translated = (respBody as GoogleTranslateApiResult).sentences
      .map((sent) => sent.trans)
      .join("");
    const result = {
      translated,
    };
    translationCache[text] = result;

    return result;
  }
}
