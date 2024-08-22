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
}

private func getSharedDefaults() -> Result<UserDefaults, YomikiriTokenizerError> {
    if let sharedDefault = UserDefaults(suiteName: APP_GROUP_ID) {
        .success(sharedDefault)
    } else {
        .failure(YomikiriTokenizerError.CouldNotRetrieveUserDefaults)
    }
}
