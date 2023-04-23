import fs from "node:fs";
import zlib from "node:zlib";

function deleteUnusedKey(obj) {
    for (const key in obj) {
        if (
            (obj[key] instanceof Array && obj[key].length === 0) ||
            obj[key] === false ||
            obj[key] === ""
            ) {
                delete obj[key]
            }
    }
}


function minifyEntries(entries) {
    for (const entry of entries) {
        for (const o of entry.forms) {
            deleteUnusedKey(o);
        }
        for (const o of entry.readings) {
            deleteUnusedKey(o);
        }
        for (const o of entry.sense) {
            deleteUnusedKey(o);
        }
        deleteUnusedKey(entry);
    }
}

async function main() {
    const input_file = process.argv[2];
    const output_file = process.argv[3];

    const data = fs.readFileSync(input_file);
    const json = JSON.parse(data);
    minifyEntries(json);
    const output_string = JSON.stringify(json);
    const compressed = zlib.gzipSync(output_string, {level: 9});
    fs.writeFileSync(output_file, compressed);   
}

main()

