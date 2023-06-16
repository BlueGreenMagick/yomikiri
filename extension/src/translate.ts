export async function translate(text: string): Promise<string> {
  const targetLang = "en";
  const encodedText = encodeURIComponent(text);

  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=ja&tl=${targetLang}&dt=t&dt=bd&dj=1&q=${encodedText}`;
  const response = await fetch(url);
  const respBody = await response.json();

  if (response.status !== 200) {
    throw respBody;
  } else {
    return respBody.sentences.map((sent: any) => sent.trans).join("");
  }
}
