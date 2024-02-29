export interface TranslateResult {
  translated: string;
  service: "google";
}

/**
 * This does not work in content scripts due to CORS.
 *
 * Use `BrowserApi.request("translate")` instead,
 */
export async function translate(text: string): Promise<TranslateResult> {
  const targetLang = "en";
  const encodedText = encodeURIComponent(text);

  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=ja&tl=${targetLang}&dt=t&dt=bd&dj=1&q=${encodedText}`;
  const response = await fetch(url);
  const respBody = await response.json();
  console.log(respBody);

  if (response.status !== 200) {
    throw respBody;
  } else {
    let translated = respBody.sentences.map((sent: any) => sent.trans).join("");
    return {
      translated,
      service: "google",
    };
  }
}
