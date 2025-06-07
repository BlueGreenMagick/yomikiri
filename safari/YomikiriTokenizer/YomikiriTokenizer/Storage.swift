/// Files and configurations shared between Yomikiri app and extensions.

import Foundation

private let defaults = getSharedDefaults()

/// @deprecated: Use rust backend DB instead.
/// This struct is only used for migration purposes
///
/// Wrapper for shared storage between app and extensions
/// Each value saved in Storage has its own getter and setter
public enum LegacyStorage {
    public static let config = StoragePropertyWithDefault<String>(key: "config", other: "{}")
    public static let jmdictEtag = StorageProperty<String>(key: "dict.jmdict.etag")
    public static let jmnedictEtag = StorageProperty<String>(key: "dict.jmnedict.etag")
    public static let dictSchemaVer = StorageProperty<Int>(key: "dict.schema_ver")
}

public struct StorageProperty<T> {
    let key: String

    public func get() throws -> T? {
        return try defaults.get().object(forKey: key) as? T
    }

    public func set(_ value: T?) throws {
        return try defaults.get().set(value, forKey: key)
    }
}

public struct StoragePropertyWithDefault<T> {
    let key: String
    let other: T

    public func get() throws -> T {
        return try defaults.get().object(forKey: key) as? T ?? other
    }

    public func set(_ value: T?) throws {
        return try defaults.get().set(value, forKey: key)
    }
}

private func getSharedDefaults() -> Result<UserDefaults, YomikiriTokenizerError> {
    if let sharedDefault = UserDefaults(suiteName: APP_GROUP_ID) {
        .success(sharedDefault)
    } else {
        .failure(YomikiriTokenizerError.CouldNotRetrieveUserDefaults)
    }
}
