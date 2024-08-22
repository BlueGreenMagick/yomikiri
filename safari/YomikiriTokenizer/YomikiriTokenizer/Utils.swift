//
//  Utils.swift
//  YomikiriTokenizer
//
//  Created by Yoonchae Lee on 8/22/24.
//

import Foundation

/// Returns URL path to directory that all Yomikiri apps share
public func getSharedDirectory() throws -> URL {
    guard let dir = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: APP_GROUP_ID) else {
        throw YomikiriTokenizerError.CouldNotAccessDirectory
    }
    return dir
}

/// Returns shared caches directory. It is created if it doesn't exist.
public func getSharedCacheDirectory() throws -> URL {
    var dir = try getSharedDirectory()
    dir = dir.appendingPathComponent("Library")
    dir = dir.appendingPathComponent("Caches")
    if !FileManager.default.fileExists(atPath: dir.path) {
        try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
    }
    return dir
}
