import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Any
import re
import json
import humps
import sys
import gzip


class JMEntry:
    # 0+ k_ele
    forms: list["JMForm"]
    # 1+ r_ele
    readings: list["JMReading"]
    # 1+ sense
    senses: list["JMSense"]

    def __init__(self) -> None:
        self.forms = []
        self.readings = []
        self.senses = []

    def to_dict(self) -> dict[str, Any]:
        d: dict[str, Any] = {}
        for p in ["forms", "readings", "senses"]:
            if len(getattr(self, p)) == 0:
                continue
            d[p] = []
            for item in getattr(self, p):
                d[p].append(item.to_dict())
        return d

    def assert_valid(self) -> None:
        assert len(self.readings) > 0
        assert len(self.senses) > 0


class JMForm:
    form: str
    # 0+ ke_inf
    info: list[str]
    # 0+ ke_pri
    priority: list[str]

    def __init__(self) -> None:
        self.form = ""
        self.info = []
        self.priority = []

    def to_dict(self) -> dict[str, Any]:
        d: dict[str, Any] = {}
        d["form"] = self.form
        for p in ["info", "priority"]:
            if len(getattr(self, p)) == 0:
                continue
            d[p] = getattr(self, p)
        return d

    def assert_valid(self) -> None:
        assert self.form != ""


class JMReading:
    reading: str
    nokanji: bool
    # 0+ re_restr
    to_form: list[str]
    # 0+ re_inf
    info: list[str]
    # 0+ re_pri
    priority: list[str]

    def __init__(self):
        self.reading = ""
        self.nokanji = False
        self.to_form = []
        self.info = []
        self.priority = []

    def to_dict(self) -> dict[str, Any]:
        d: dict[str, Any] = {}
        d["reading"] = self.reading
        if self.nokanji:
            d["nokanji"] = self.nokanji
        for p in ["to_form", "info", "priority"]:
            if len(getattr(self, p)) == 0:
                continue
            d[p] = getattr(self, p)
        return d

    def clean(self) -> None:
        if self.nokanji == False:
            del self.nokanji
        if len(self.to_form) == 0:
            del self.to_form
        if len(self.info) == 0:
            del self.info
        if len(self.priority) == 0:
            del self.priority

    def assert_valid(self) -> None:
        assert self.reading != ""


class JMSense:
    # 0+ stagk
    to_form: list[str]
    # 0+ stagr
    to_reading: list[str]
    # pos
    part_of_speech: list[str]
    # misc
    misc: list[str]
    # s_inf
    info: list[str]
    # dial
    dialect: list[str]
    # gloss
    meaning: list[str]

    def __init__(self):
        self.to_form = []
        self.to_reading = []
        self.part_of_speech = []
        self.misc = []
        self.info = []
        self.dialect = []
        self.meaning = []

    def to_dict(self) -> dict[str, Any]:
        d: dict[str, Any] = {}
        for p in [
            "to_form",
            "to_reading",
            "part_of_speech",
            "misc",
            "info",
            "dialect",
            "meaning",
        ]:
            if len(getattr(self, p)) == 0:
                continue
            d[p] = getattr(self, p)
        return d

    def assert_valid(self) -> None:
        pass


def unescape_entity(xml: str) -> str:
    return re.sub(r"&([\w\d-]+);", "=\g<1>=", xml)


def read_jmdict_xml(path: Path) -> ET.Element:
    xml = path.read_text()
    xml = unescape_entity(xml)
    return ET.fromstring(xml)


def xml_text(elem: ET.Element) -> str:
    assert len(elem) == 0
    assert isinstance(elem.text, str)
    return elem.text


def parse_jm_form(elem: ET.Element) -> JMForm:
    form = JMForm()
    for child in elem:
        if child.tag == "keb":
            form.form = xml_text(child)
        elif child.tag == "ke_inf":
            form.info.append(xml_text(child))
        elif child.tag == "ke_pri":
            form.priority.append(xml_text(child))
        else:
            raise Exception("Unknown tag in <form>: " + child.tag)
    form.assert_valid()
    return form


def parse_jm_reading(elem: ET.Element) -> JMReading:
    reading = JMReading()
    for child in elem:
        if child.tag == "reb":
            reading.reading = xml_text(child)
        elif child.tag == "re_nokanji":
            reading.nokanji = True
        elif child.tag == "re_restr":
            reading.to_form.append(xml_text(child))
        elif child.tag == "re_inf":
            reading.info.append(xml_text(child))
        elif child.tag == "re_pri":
            reading.priority.append(xml_text(child))
        else:
            raise Exception("Unknown tag in <reading>: " + child.tag)
    reading.assert_valid()
    return reading


def parse_jm_sense(elem: ET.Element) -> JMSense:
    sense = JMSense()
    for child in elem:
        if child.tag == "stagk":
            sense.to_form.append(xml_text(child))
        elif child.tag == "stagr":
            sense.to_reading.append(xml_text(child))
        elif child.tag == "pos":
            sense.part_of_speech.append(xml_text(child))
        elif child.tag == "misc":
            sense.misc.append(xml_text(child))
        elif child.tag == "s_inf":
            sense.info.append(xml_text(child))
        elif child.tag == "dial":
            sense.dialect.append(xml_text(child))
        elif child.tag == "gloss":
            sense.meaning.append(xml_text(child))
        elif child.tag in ["lsource", "example", "xref", "ant", "field"]:
            pass
        else:
            raise Exception("Unknown tag in <sense>: " + child.tag)
    sense.assert_valid()
    return sense


def parse_jm_entry(elem: ET.Element) -> JMEntry:
    entry = JMEntry()
    for child in elem:
        if child.tag == "ent_seq":
            pass
        elif child.tag == "k_ele":
            form = parse_jm_form(child)
            entry.forms.append(form)
        elif child.tag == "r_ele":
            reading = parse_jm_reading(child)
            entry.readings.append(reading)
        elif child.tag == "sense":
            sense = parse_jm_sense(child)
            entry.senses.append(sense)
    entry.assert_valid()
    return entry


def parse_jm_dict(root: ET.Element):
    entries: list[JMEntry] = []
    for i, child in enumerate(root):
        if child.tag == "entry":
            try:
                entry = parse_jm_entry(child)
                entries.append(entry)
            except Exception as e:
                print("ERROR at entry ", i)
                raise e
        else:
            raise Exception("Unknown tag in <jmdict>: " + child.tag)
    return entries


def main() -> int:
    if len(sys.argv) < 3:
        print("This program requires two arguments: <input dict path> <output_path>")
        return 1
    input_path = sys.argv[1]
    output_path = sys.argv[2]

    jm_xml_en = read_jmdict_xml(Path(input_path))
    jm_en = parse_jm_dict(jm_xml_en)
    dicts = []
    for entry in jm_en:
        dicts.append(entry.to_dict())

    with gzip.open(output_path, "wt", encoding="utf-8") as f:
        json.dump(humps.camelize(dicts), f, ensure_ascii=False)

    return 0


main()
