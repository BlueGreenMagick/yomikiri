//
//  SharedStorage.swift
//  Yomikiri
//
//  Created by Yoonchae Lee on 2023/07/04.
//

import Foundation


// namespace
enum SharedStorage {
    static let APP_GROUP_ID = "group.com.bluegreenmagick.yomikiri"
    
    static func loadConfig() throws -> String {
        guard let sharedDefault = UserDefaults(suiteName: SharedStorage.APP_GROUP_ID) else {
            throw "Could not retrieve UserDefaults"
        }
        return sharedDefault.string(forKey: "config") ?? "{}"
    }

    static func saveConfig(configJson: String) throws {
        guard let sharedDefault = UserDefaults(suiteName: SharedStorage.APP_GROUP_ID) else {
            throw "Could not retrieve UserDefaults"
        }
        sharedDefault.setValue(configJson, forKey: "config")
    }
}


