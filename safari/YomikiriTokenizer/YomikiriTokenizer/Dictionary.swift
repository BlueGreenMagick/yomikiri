import Foundation
import os.log

struct DictUrls {
    var index: URL
    var entries: URL
    var metadata: URL
}

let bundle = Bundle(for: Backend.self)

public func updateDictionary() throws -> DictMetadata {
    let tmpDir = try getSharedCacheDirectory()
    let tmpIndexUrl = tmpDir.appendingPathComponent("english.yomikiriindex")
    let tmpEntriesUrl = tmpDir.appendingPathComponent("english.yomikiridict")
    let tmpMetadataUrl = tmpDir.appendingPathComponent("dictionary-metadata.json")

    for tmpUrl in [tmpIndexUrl, tmpEntriesUrl, tmpMetadataUrl] {
        if FileManager.default.fileExists(atPath: tmpUrl.path) {
            try FileManager.default.removeItem(at: tmpUrl)
        }
    }
    let metadata = try updateDictionaryFile(indexPath: tmpIndexUrl.path, entriesPath: tmpEntriesUrl.path)

    let metadataJson = try jsonSerialize(metadata)
    try metadataJson.write(to: tmpMetadataUrl, atomically: true, encoding: String.Encoding.utf8)

    let dictionaryDirUrl = try getDictionaryDirUrl()
    let userDictUrls = try installedDictionaryUrl()

    for url in [userDictUrls.index, userDictUrls.entries, userDictUrls.metadata] {
        if FileManager.default.fileExists(atPath: url.path) {
            try FileManager.default.removeItem(at: url)
        }
    }
    try FileManager.default.copyItem(at: tmpIndexUrl, to: userDictUrls.index)
    try FileManager.default.copyItem(at: tmpEntriesUrl, to: userDictUrls.entries)
    try FileManager.default.copyItem(at: tmpMetadataUrl, to: userDictUrls.metadata)

    return try getDictionaryMetadata()
}

func getDictionaryPath() throws -> DictUrls {
    if let dictUrls = tryGetInstalledDictionaryUrl() {
        os_log(.debug, "Using updated JMDict")
        return dictUrls
    } else {
        os_log(.debug, "Using bundled JMDict")
        guard let indexUrl = bundle.url(forResource: "english", withExtension: "yomikiriindex", subdirectory: "res") else {
            throw YomikiriTokenizerError.BaseResourceNotFound
        }
        guard let entriesUrl = bundle.url(forResource: "english", withExtension: "yomikiridict", subdirectory: "res") else {
            throw YomikiriTokenizerError.BaseResourceNotFound
        }
        guard let metadataUrl = bundle.url(forResource: "dictionary-metadata", withExtension: "json", subdirectory: "res") else {
            throw YomikiriTokenizerError.BaseResourceNotFound
        }
        return DictUrls(
            index: indexUrl,
            entries: entriesUrl,
            metadata: metadataUrl
        )
    }
}

// file may not exist at url.
func installedDictionaryUrl() throws -> DictUrls {
    let dictionaryDirUrl = try getDictionaryDirUrl()
    return DictUrls(
        index: dictionaryDirUrl.appendingPathComponent("english.yomikiriindex"),
        entries: dictionaryDirUrl.appendingPathComponent("english.yomikiridict"),
        metadata: dictionaryDirUrl.appendingPathComponent("dictionary-metadata.json")
    )
}

func tryGetInstalledDictionaryUrl() -> DictUrls? {
    guard let dictUrls = try? installedDictionaryUrl() else {
        return nil
    }
    for url in [dictUrls.index, dictUrls.entries, dictUrls.metadata] {
        if !FileManager.default.fileExists(atPath: url.path) {
            return nil
        }
    }
    return dictUrls
}

public func getDictionaryMetadata() throws -> DictMetadata {
    guard let dictUrls = tryGetInstalledDictionaryUrl() else {
        return try getDefaultDictionaryMetadata()
    }
    let json = try String(contentsOf: dictUrls.metadata, encoding: .utf8)
    let decoder = JSONDecoder()
    guard let jsonData = json.data(using: .utf8) else {
        throw YomikiriTokenizerError.IsNotValidUtf8(context: "dictionary-metadata.json")
    }
    let metadata = try decoder.decode(DictMetadata.self, from: jsonData)
    return metadata
}

func getDefaultDictionaryMetadata() throws -> DictMetadata {
    guard let jsonUrl = bundle.url(forResource: "dictionary-metadata", withExtension: "json", subdirectory: "res") else {
        throw YomikiriTokenizerError.BaseResourceNotFound
    }
    let json = try String(contentsOf: jsonUrl, encoding: .utf8)
    let decoder = JSONDecoder()
    guard let jsonData = json.data(using: .utf8) else {
        throw YomikiriTokenizerError.IsNotValidUtf8(context: "dictionary-metadata.json")
    }
    let metadata = try decoder.decode(DictMetadata.self, from: jsonData)
    return metadata
}

func getDictionaryDirUrl() throws -> URL {
    let rootDirUrl = try getSharedDirectory()
    let dir = rootDirUrl.appendingPathComponent("dictionary")
    if !FileManager.default.fileExists(atPath: dir.path) {
        try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
    }
    return dir
}

func jsonSerialize<T: Encodable>(_ obj: T?) throws -> String {
    let encoder = JSONEncoder()
    let data = try encoder.encode(obj)
    return String(data: data, encoding: .utf8) ?? "null"
}

func jsonDeserialize<T: Decodable>(_ json: String) throws -> T {
    let decoder = JSONDecoder()
    return try decoder.decode(T.self, from: json.data(using: .utf8)!)
}
