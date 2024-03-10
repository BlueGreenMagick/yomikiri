Compare tokenizers with tokenizer accuracy, startup time, tokenization time, memory usage, file size.

### Vaporetto

[Vaporetto](https://github.com/daac-tools/vaporetto)
Using model from https://github.com/daac-tools/vaporetto-models/releases/tag/v0.5.0

Vaporetto seemed like a good fit for Yomikiri with its model size quite small at 58MB, and with better accuracy than mecab unidic v3.1.

However, Vaporetto turned out to be not suitable for use in Yomikiri. It has a very slow startup time, at 37s (compared to Lindera's 0.03ms). The small model size was due to using bincode VarIntEncoding, and using FixedIntEncoding balloned the size up to 120MB. Memory allocation of Vaporetto Predictor is estimated to be about 250MB (estimated using jemalloc-ctl), so it cannot fit in ios extension's 80MB memory limit. It seems difficult for Vaporetto to use static memory like Lindera can do.