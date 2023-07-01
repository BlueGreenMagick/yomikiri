Prepares a [JMDict](https://www.edrdg.org/jmdict/j_jmdict.html) xml file into a json format to be used in Yomikiri.

Compatible with JMDict DTD v1.09


1. Download a JMDict file and put into ./resources
2. Install humps library `pip install pyhumps`
3. Run the following command.
```shell
python3 prepare_dict.py "./resources/<jmdict file name>" "<json.gz path>"
```