# Encoding Experiments

This branch contains experiments on using various algorithms to encode yomikiri dictionary entries file.
Most of the changes are made to `yomikiri-dictionary` and `yomikiri-dictionary-generator` crates.

### Comparisons
| encoding                       | size   | smaz-size |
| ------------------------------ | ------ | --------- |
| serde_json + gzip (16kb chunk) | 9.4MB  | 10.9MB    |
| serde_json                     | 30MB   | 37.5MB    |
| bincode                        | 20.2MB |           |
| serde-bincode *                | 17.4MB | 14.8MB    |

\* This is because serde-bincode skips serializing some fields for empty value. May not work when de-serializing with bincode.

### Experiments
- Tried out using [smaz](https://docs.rs/smaz/latest/smaz/) to compress meanings field.


### Observations
- Out of 17MB of bincode dictionary entry file size, 8MB holds `meaning` field, 0.6MB holds `info`, `misc`, `dialect` field.