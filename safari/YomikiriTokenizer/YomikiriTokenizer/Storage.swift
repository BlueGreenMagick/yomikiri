/// Files and configurations shared between Yomikiri app and extensions.

import Foundation

/// Wrapper for shared storage between app and extensions
/// Each value saved in Storage has its own getter and setter
public enum Storage {
    static var defaults = getSharedDefaults()

    public static func getConfig() throws -> String {
        return try defaults.get().string(forKey: "config") ?? "{}"
    }

    public static func setConfig(_ configJson: String) throws {
        return try defaults.get().set(configJson, forKey: "config")
    }

    /// Returns 0 if not set
    public static func getDictSchemaVer() throws -> Int {
        return try defaults.get().integer(forKey: "dict.schema_ver")
    }

    public static func setDictSchemaVer(_ schemaVer: Int?) throws {
        return try defaults.get().set(schemaVer, forKey: "dict.schema_ver")
    }

    public static func getJmdictEtag() throws -> String? {
        return try defaults.get().string(forKey: "dict.jmdict.etag")
    }

    public static func setJmdictEtag(_ etag: String?) throws {
        return try defaults.get().set(etag, forKey: "dict.jmdict.etag")
    }

    public static func getJmnedictEtag() throws -> String? {
        return try defaults.get().string(forKey: "dict.jmdict.etag")
    }

    public static func setJmnedictEtag(_ etag: String?) throws {
        return try defaults.get().set(etag, forKey: "dict.jmnedict.etag")
    }
}

private func getSharedDefaults() -> Result<UserDefaults, YomikiriTokenizerError> {
    if let sharedDefault = UserDefaults(suiteName: APP_GROUP_ID) {
        .success(sharedDefault)
    } else {
        .failure(YomikiriTokenizerError.CouldNotRetrieveUserDefaults)
    }
}
