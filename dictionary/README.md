Prepares a [JMDict](https://www.edrdg.org/jmdict/j_jmdict.html) xml file into a json format to be used in Yomikiri.

Compatible with JMDict DTD v1.09


1. Download a JMDict file and put into ./resources
2. Run the following command.
```shell
cargo run -- "./resources/JMdict_e" "./resources/english.yomikiridict" "./resources/english.yomikiriindex"
```