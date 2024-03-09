export interface TranslateResult {
  translated: string;
}

const translationCache: { [text: string]: TranslateResult } = {};

/**
 * This does not work in content scripts due to CORS.
 *
 * Use `BrowserApi.request("translate")` instead,
 */
export async function translate(text: string): Promise<TranslateResult> {
  if (translationCache.hasOwnProperty(text)) {
    return translationCache[text];
  }

  const targetLang = "en";
  const encodedText = encodeURIComponent(text);

  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=ja&tl=${targetLang}&dt=t&dt=bd&dj=1&q=${encodedText}`;
  const response = await fetch(url);
  const respBody = await response.json();

  if (response.status !== 200) {
    console.error(respBody);
    throw respBody;
  } else {
    let translated: string = respBody.sentences
      .map((sent: any) => sent.trans)
      .join("");
    let result = {
      translated,
    };
    translationCache[text] = result;

    return result;
  }
}