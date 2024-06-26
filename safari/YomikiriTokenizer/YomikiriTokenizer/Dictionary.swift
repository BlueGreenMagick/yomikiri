//
//  Dictionary.swift
//  YomikiriTokenizer
//
//  Created by Yoonchae Lee on 3/13/24.
//

import Foundation
import os.log

public struct DictionaryMetadata: Codable {
    let downloadDate: String
    let filesSize: Int
}

let bundle = Bundle(for: Backend.self)

public func updateDictionary() throws -> DictionaryMetadata {
    let tmpDir = try getSharedCacheDirectory()
    let tmpIndexUrl = tmpDir.appendingPathComponent("english.yomikiriindex")
    let tmpEntriesUrl = tmpDir.appendingPathComponent("english.yomikiridict")
    if FileManager.default.fileExists(atPath: tmpIndexUrl.path) {
        try FileManager.default.removeItem(at: tmpIndexUrl)
    }
    if FileManager.default.fileExists(atPath: tmpEntriesUrl.path) {
        try FileManager.default.removeItem(at: tmpEntriesUrl)
    }

    try updateDictionaryFile(indexPath: tmpIndexUrl.path, entriesPath: tmpEntriesUrl.path)

    let dictionaryDirUrl = try getDictionaryDirUrl()
    let destIndexUrl = dictionaryDirUrl.appendingPathComponent("english.yomikiriindex")
    let destEntriesUrl = dictionaryDirUrl.appendingPathComponent("english.yomikiridict")
    if FileManager.default.fileExists(atPath: destIndexUrl.path) {
        try FileManager.default.removeItem(at: destIndexUrl)
    }
    if FileManager.default.fileExists(atPath: destEntriesUrl.path) {
        try FileManager.default.removeItem(at: destEntriesUrl)
    }

    try FileManager.default.copyItem(at: tmpIndexUrl, to: destIndexUrl)
    try FileManager.default.copyItem(at: tmpEntriesUrl, to: destEntriesUrl)

    return try getDictionaryMetadata()
}

func getDictionaryPath() throws -> (index: String, entries: String) {
    if let (index, entries) = tryGetInstalledDictionaryUrl() {
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

func tryGetInstalledDictionaryUrl() -> (index: URL, entries: URL)? {
    guard let dictionaryDirUrl = try? getDictionaryDirUrl() else {
        return nil
    }
    let dictIndexUrl = dictionaryDirUrl.appendingPathComponent("english.yomikiriindex")
    let dictEntriesUrl = dictionaryDirUrl.appendingPathComponent("english.yomikiridict")
    if !FileManager.default.fileExists(atPath: dictIndexUrl.path) {
        return nil
    }
    if !FileManager.default.fileExists(atPath: dictEntriesUrl.path) {
        return nil
    }

    return (index: dictIndexUrl, entries: dictEntriesUrl)
}

public func getDictionaryMetadata() throws -> DictionaryMetadata {
    guard let (destIndexUrl, destEntriesUrl) = tryGetInstalledDictionaryUrl() else {
        return try getDefaultDictionaryMetadata()
    }

    let indexAttrs = try FileManager.default.attributesOfItem(atPath: destIndexUrl.path)
    let entriesAttrs = try FileManager.default.attributesOfItem(atPath: destEntriesUrl.path)

    guard let entriesDownloadDate = indexAttrs[.modificationDate] as? Date else {
        throw YomikiriTokenizerError.RetrieveModificationDateError
    }
    let formattedDate = entriesDownloadDate.formatted(.iso8601
        .year()
        .month()
        .day()
        .timeZone(separator: .omitted)
        .time(includingFractionalSeconds: true)
        .timeSeparator(.colon)
    )

    guard let indexSize = indexAttrs[.size] as? Int else {
        throw YomikiriTokenizerError.CalculateFileSizeError
    }
    guard let entriesSize = entriesAttrs[.size] as? Int else {
        throw YomikiriTokenizerError.CalculateFileSizeError
    }
    let filesSize = indexSize + entriesSize

    return DictionaryMetadata(downloadDate: formattedDate, filesSize: filesSize)
}

func getDefaultDictionaryMetadata() throws -> DictionaryMetadata {
    guard let jsonUrl = bundle.url(forResource: "dictionary-metadata", withExtension: "json", subdirectory: "res") else {
        throw YomikiriTokenizerError.BaseResourceNotFound
    }
    let json = try String(contentsOf: jsonUrl, encoding: .utf8)
    let decoder = JSONDecoder()
    guard let jsonData = json.data(using: .utf8) else {
        throw YomikiriTokenizerError.IsNotValidUtf8(context: "dictionary-manifest.json")
    }
    let metadata = try decoder.decode(DictionaryMetadata.self, from: jsonData)
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
