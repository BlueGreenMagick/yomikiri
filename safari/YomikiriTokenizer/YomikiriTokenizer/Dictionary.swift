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

    func urls() -> [URL] {
        return [index, entries, metadata]
    }

    /// Throw error if shared directory could not be retrieved,
    /// or if user dictionary directory could not be created.
    static var user = Result { try DictUrls.fromDirectory(getUserDictDir()) }
    static var bundled = Result { try DictUrls.fromDirectory(getBundledDictDir()) }
}

/// Generate dictionary files and save it to filesystem
public func updateDictionary() throws -> DictMetadata {
    let userDict = try DictUrls.user.get()
    return try updateDictionaryFile(indexPath: userDict.index.path, entriesPath: userDict.entries.path, metadataPath: userDict.metadata.path)
}

public func getDictionaryMetadata() throws -> DictMetadata {
    if let userDict = try validateAndGetUserDict() {
        return try getMetadata(userDict)
    } else {
        let bundledDict = try DictUrls.bundled.get()
        return try getMetadata(bundledDict)
    }
}

/// Get dictionary `DictUrls` suitable for use.
///
/// Return user dictionary if it exists, is valid, and not stale.
/// Otherwise, return bundled dictionary.
func getDict() throws -> DictUrls {
    if let userDict = try validateAndGetUserDict() {
        os_log(.debug, "Using updated JMDict")
        return userDict
    } else {
        os_log(.debug, "Using bundled JMDict")
        let bundledDict = try DictUrls.bundled.get()

        for url in bundledDict.urls() {
            if !FileManager.default.fileExists(atPath: url.path) {
                throw YomikiriTokenizerError.BaseResourceNotFound
            }
        }
        return bundledDict
    }
}

/// @return user dictionary `dictUrls` if it exists, is valid, and fresh.
/// Otherwise, returns `nil`, and deletes user dictionary files if it exists.
/// Throws if there is a problem with retrieving bundled dictionary.
///
/// User dictionary is invalid if its 'schema\_ver' is not equal to bundled's 'schema\_ver'.
/// It is stale if its 'download\_date' is earlier than bundled's 'download\_date'
private func validateAndGetUserDict() throws -> DictUrls? {
    let bundledDict = try DictUrls.bundled.get()
    guard let userDict = DictUrls.user.ok() else {
        return nil
    }

    let userDictIsValid = try validateUserDict(bundledDict: bundledDict, userDict: userDict)
    if userDictIsValid {
        return userDict
    } else {
        os_log(.info, "Deleting user dictionary files")
        for url in userDict.urls() {
            _ = try? FileManager.default.removeItem(at: url)
        }
        return nil
    }
}

/// @return `true` if user dictionary exists, is valid, and fresh.
private func validateUserDict(bundledDict: DictUrls, userDict: DictUrls) throws -> Bool {
    // Some dictionary file is missing
    for url in userDict.urls() {
        if !FileManager.default.fileExists(atPath: url.path) {
            return false
        }
    }

    // We try retrieving bundled metadata first,
    // so if there's a problem that is not related to user dictionary files,
    // an error is thrown instead of returning false.
    let bundledMetadata = try getMetadata(bundledDict)
    guard let userMetadata = try? getMetadata(userDict) else {
        os_log(.info, "User dictionary json file could not be parsed.")
        return false
    }

    // Invalid dictionary schema
    if bundledMetadata.schemaVer != userMetadata.schemaVer {
        os_log(.info, "User dictionary has invalid schema version")
        return false
    }

    // Check for stale dictionary
    guard let bundledDownloadDate = parseDateString(bundledMetadata.downloadDate) else {
        throw YomikiriTokenizerError.Fatal("Could not parse download date of bundled dictionary metadata")
    }
    guard let userDownloadDate = parseDateString(userMetadata.downloadDate) else {
        os_log(.info, "User dictionary has invalid metadata download date format")
        return false
    }
    if bundledDownloadDate >= userDownloadDate {
        os_log(.info, "User dictionary has become stale")
        return false
    }

    return true
}

private func getMetadata(_ dict: DictUrls) throws -> DictMetadata {
    let json = try String(contentsOf: dict.metadata, encoding: .utf8)
    return try jsonDeserialize(json)
}

/// Get user dictionary directory, creating the directory if it does not exist.
private func getUserDictDir() throws -> URL {
    let rootDirUrl = try getSharedDirectory()
    let dir = rootDirUrl.appendingPathComponent("dictionary")
    if !FileManager.default.fileExists(atPath: dir.path) {
        try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
    }
    #if targetEnvironment(simulator)
        os_log(.debug, "User Directory: %{public}s", dir.path)
    #endif
    return dir
}

private func getBundledDictDir() throws -> URL {
    guard let resourceDir = bundle.resourceURL else {
        throw YomikiriTokenizerError.BaseResourceNotFound
    }
    return resourceDir.appendingPathComponent("files")
}

private func parseDateString(_ dateString: String) -> Date? {
    let formatter = ISO8601DateFormatter()
    return formatter.date(from: dateString)
}
