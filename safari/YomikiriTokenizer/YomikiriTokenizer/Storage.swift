/// Files and configurations shared between Yomikiri app and extensions.

import Foundation

private let defaults = getSharedDefaults()

/// @deprecated: Use rust backend DB instead.
/// This struct is only used for migration purposes
///
/// Wrapper for shared storage between app and extensions
/// Each value saved in Storage has its own getter and setter
public enum LegacyStorage {
    public static var config: LegacyStoragePropertyWithDefault<String> {
        .init(key: "config", other: "{}")
    }

    public static var jmdictEtag: LegacyStorageProperty<String> {
        .init(key: "dict.jmdict.etag")
    }

    public static var jmnedictEtag: LegacyStorageProperty<String> {
        .init(key: "dict.jmnedict.etag")
    }

    public static var dictSchemaVer: LegacyStorageProperty<Int> {
        .init(key: "dict.schema_ver")
    }
}

public struct LegacyStorageProperty<T> {
    let key: String

    public func get() throws -> T? {
        return try defaults.get().object(forKey: key) as? T
    }

    public func set(_ value: T?) throws {
        return try defaults.get().set(value, forKey: key)
    }
}

public struct LegacyStoragePropertyWithDefault<T> {
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
