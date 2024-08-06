//
//  Dictionary.swift
//  YomikiriTokenizer
//
//  Created by Yoonchae Lee on 3/13/24.
//

import Foundation
import os.log

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
    let (destIndexUrl, destEntriesUrl, destMetadataUrl) = try installedDictionaryUrl()

    for url in [destIndexUrl, destEntriesUrl, destMetadataUrl] {
        if FileManager.default.fileExists(atPath: url.path) {
            try FileManager.default.removeItem(at: url)
        }
    }
    try FileManager.default.copyItem(at: tmpIndexUrl, to: destIndexUrl)
    try FileManager.default.copyItem(at: tmpEntriesUrl, to: destEntriesUrl)
    try FileManager.default.copyItem(at: tmpMetadataUrl, to: destMetadataUrl)

    return try getDictionaryMetadata()
}

func getDictionaryPath() throws -> (index: String, entries: String) {
    if let (index, entries, _) = tryGetInstalledDictionaryUrl() {
        os_log(.debug, "Using updated JMDict")
        return (index.path, entries.path)
    } else {
        os_log(.debug, "Using bundled JMDict")
        guard let indexPath = bundle.path(forResource: "english", ofType: "yomikiriindex", inDirectory: "res") else {
            throw YomikiriTokenizerError.BaseResourceNotFound
        }
        guard let entriesPath = bundle.path(forResource: "english", ofType: "yomikiridict", inDirectory: "res") else {
            throw YomikiriTokenizerError.BaseResourceNotFound
        }
        return (indexPath, entriesPath)
    }
}

// file may not exist at url.
func installedDictionaryUrl() throws -> (index: URL, entries: URL, metadata: URL) {
    let dictionaryDirUrl = try getDictionaryDirUrl()
    let dictIndexUrl = dictionaryDirUrl.appendingPathComponent("english.yomikiriindex")
    let dictEntriesUrl = dictionaryDirUrl.appendingPathComponent("english.yomikiridict")
    let dictMetadataUrl = dictionaryDirUrl.appendingPathComponent("dictionary-metadata.json")

    return (index: dictIndexUrl, entries: dictEntriesUrl, metadata: dictMetadataUrl)
}

func tryGetInstalledDictionaryUrl() -> (index: URL, entries: URL, metadata: URL)? {
    guard let (indexUrl, entriesUrl, metadataUrl) = try? installedDictionaryUrl() else {
        return nil
    }
    for url in [indexUrl, entriesUrl, metadataUrl] {
        if !FileManager.default.fileExists(atPath: url.path) {
            return nil
        }
    }
    return (index: indexUrl, entries: entriesUrl, metadata: metadataUrl)
}

public func getDictionaryMetadata() throws -> DictMetadata {
    guard let (_, _, dictMetadataUrl) = tryGetInstalledDictionaryUrl() else {
        return try getDefaultDictionaryMetadata()
    }
    let json = try String(contentsOf: dictMetadataUrl, encoding: .utf8)
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
