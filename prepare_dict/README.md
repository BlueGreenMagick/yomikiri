Prepares a [JMDict](https://www.edrdg.org/jmdict/j_jmdict.html) xml file into a json format to be used in Yomikiri.

Compatible with JMDict DTD v1.09


1. Download a JMDict file and put into ./resources
2. Remove DocType DTD specification
3. Run the following command.
```shell
cargo run -- ./resources/<jmdict_file_name> <output_path>
```
4. Compress with gzip.