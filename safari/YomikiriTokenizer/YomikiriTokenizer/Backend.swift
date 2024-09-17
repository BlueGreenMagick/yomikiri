//
//  Backend.swift
//  YomikiriTokenizer
//
//  Created by Yoonchae Lee on 2023/07/10.
//

import Foundation
import os.log

public enum Backend {
    private static var rust = Result { try createRustBackend() }

    /// Get backend, initializing it when first called.
    public static func get() throws -> RustBackend {
        return try Backend.rust.get()
    }

    /// Updates dictionary files, and updates dictionary used within backend.
    ///
    /// - Returns: `false` if dictionary is already up-to-date, and was not rebuilt. Otherwise, `true`
    public static func updateDictionary() async throws -> Bool {
        let dir = try filesDirectory()

        let jmdictResult = try downloadJmdict(dir: dir.path, etag: Storage.getJmdictEtag())
        if case let .replace(etag: etag) = jmdictResult {
            try Storage.setJmdictEtag(etag)
        }
        let jmnedictResult = try downloadJmnedict(dir: dir.path, etag: Storage.getJmnedictEtag())
        if case let .replace(etag: etag) = jmnedictResult {
            try Storage.setJmnedictEtag(etag)
        }

        // drop backend to close mmap and open file handle
        Backend.rust = Result.failure(YomikiriTokenizerError.UpdatingDictionary)
        var err: (any Error)? = nil
        do {
            try createDictionary(dir: dir.path)
        } catch {
            err = error
        }
        // this may result in using bundled dictionary if new user dictionary throws an error
        Backend.rust = Result { try createRustBackend() }

        let schemaVer = Int(dictSchemaVer())
        try Storage.setDictSchemaVer(schemaVer)

        if let err = err {
            throw err
        }
        return true
    }
}

private func createRustBackend() throws -> RustBackend {
    os_log(.debug, "start creating backend")
    if let userDict = try? validateAndGetUserDict() {
        if let rust = try? RustBackend(dictPath: userDict.path) {
            return rust
        } else {
            os_log(.error, "Failed to create rust backend using user downlaoded dictionary. Using bundled dictionary instead.")
        }
    }
    let bundledDict = try getBundledDictUrl()
    let backend = try RustBackend(dictPath: bundledDict.path)
    os_log(.debug, "finish creating backend")
    return backend
}
