import { Tokenizer as WasmTokenizer } from "@yomikiri/lindera-wasm"

export class Tokenizer {
    tokenizer: WasmTokenizer;

    constructor() {
        this.tokenizer = new WasmTokenizer();
    }

    tokenize(phrase: string): string[] {
        const indices = this.tokenizer.tokenize(phrase);
        const words: string[] = []
        console.log(indices)
        for (let i = 0; i < indices.length - 1; i++) {
            const start = indices[i];
            const end = indices[i + 1];
            const word = phrase.substring(start, end);
            words.push(word);
        }
        if (phrase.length > 0) {
            const start = indices[indices.length - 1];
            const end = phrase.length;
            words.push(phrase.substring(start, end));
        }
        return words;
    }
}
