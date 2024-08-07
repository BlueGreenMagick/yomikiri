import Foundation
import os.log

struct DictUrls {
    var index: URL
    var entries: URL
    var metadata: URL

    static func fromDirectory(_ dir: URL) -> DictUrls {
        DictUrls(
            index: dir.appendingPathComponent("english.yomikiriindex"),
            entries: dir.appendingPathComponent("english.yomikiridict"),
            metadata: dir.appendingPathComponent("dictionary-metadata.json")
        )
    }

    static var user = Result { try DictUrls.fromDirectory(getUserDictDir()) }
    static var bundled = Result { try DictUrls.fromDirectory(getBundledDictDir()) }
}

public func updateDictionary() throws -> DictMetadata {
    let tmpDir = try getSharedCacheDirectory()
    let tmpUrls = DictUrls.fromDirectory(tmpDir)

    for tmpUrl in [tmpUrls.index, tmpUrls.entries, tmpUrls.metadata] {
        if FileManager.default.fileExists(atPath: tmpUrl.path) {
            try FileManager.default.removeItem(at: tmpUrl)
        }
    }
    let metadata = try updateDictionaryFile(indexPath: tmpUrls.index.path, entriesPath: tmpUrls.entries.path)

    let metadataJson = try jsonSerialize(metadata)
    try metadataJson.write(to: tmpUrls.metadata, atomically: true, encoding: String.Encoding.utf8)

    let userDictUrls = try DictUrls.user.get()

    for url in [userDictUrls.index, userDictUrls.entries, userDictUrls.metadata] {
        if FileManager.default.fileExists(atPath: url.path) {
            try FileManager.default.removeItem(at: url)
        }
    }
    try FileManager.default.copyItem(at: tmpUrls.index, to: userDictUrls.index)
    try FileManager.default.copyItem(at: tmpUrls.entries, to: userDictUrls.entries)
    try FileManager.default.copyItem(at: tmpUrls.metadata, to: userDictUrls.metadata)

    return try getDictionaryMetadata()
}

public func getDictionaryMetadata() throws -> DictMetadata {
    guard let dictUrls = validateAndGetUserDictUrls() else {
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

func getDictionaryUrls() throws -> DictUrls {
    if let dictUrls = validateAndGetUserDictUrls() {
        os_log(.debug, "Using updated JMDict")
        return dictUrls
    } else {
        os_log(.debug, "Using bundled JMDict")
        let bundledDictUrls = try DictUrls.bundled.get()

        for url in [bundledDictUrls.index, bundledDictUrls.entries, bundledDictUrls.metadata] {
            if !FileManager.default.fileExists(atPath: url.path) {
                throw YomikiriTokenizerError.BaseResourceNotFound
            }
        }
        return bundledDictUrls
    }
}

private func validateAndGetUserDictUrls() -> DictUrls? {
    guard let dictUrls = DictUrls.user.ok() else {
        return nil
    }

    for url in [dictUrls.index, dictUrls.entries, dictUrls.metadata] {
        if !FileManager.default.fileExists(atPath: url.path) {
            return nil
        }
    }
    return dictUrls
}

private func getDefaultDictionaryMetadata() throws -> DictMetadata {
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

/// Get user dictionary directory, creating the directory if it does not exist.
private func getUserDictDir() throws -> URL {
    let rootDirUrl = try getSharedDirectory()
    let dir = rootDirUrl.appendingPathComponent("dictionary")
    if !FileManager.default.fileExists(atPath: dir.path) {
        try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
    }
    return dir
}

private func getBundledDictDir() throws -> URL {
    guard let resourceDir = bundle.resourceURL else {
        throw YomikiriTokenizerError.BaseResourceNotFound
    }
    return resourceDir.appendingPathComponent("res")
}
