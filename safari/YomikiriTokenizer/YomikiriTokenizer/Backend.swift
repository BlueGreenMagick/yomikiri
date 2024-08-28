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
    ///
    /// If an error occurs, tries to restore previous dictionary.
    public static func updateDictionary() async throws -> Bool {
        let tempDir = FileManager.default.temporaryDirectory
        let userDict = try getUserDictUrl()
        // update file in background thread
        let result = try await Task {
            try updateDictionaryFile(tempDir: tempDir.path, etag: Storage.getJmdictEtag())
        }.value

        guard case let .replace(job: replaceJob, etag) = result else {
            return false
        }

        // drop backend to close mmap and open file handle
        Backend.rust = Result.failure(YomikiriTokenizerError.UpdatingDictionary)
        do {
            let rust = try replaceJob.replace(dictPath: userDict.path)
            try Storage.setJmdictEtag(etag)
            Backend.rust = Result.success(rust)
        } catch {
            // using restored user dictionary
            Backend.rust = Result { try createRustBackend() }
            throw error
        }
        let schemaVer = Int(dictSchemaVer())
        try Storage.setDictSchemaVer(schemaVer)
        return true
    }
}

private func createRustBackend() throws -> RustBackend {
    os_log(.debug, "start creating backend")
    if let userDict = try? validateAndGetUserDict() {
        if let rust = try? RustBackend(dictPath: userDict.path) {
            return rust
        }
    }
    let bundledDict = try getBundledDictUrl()
    let backend = try RustBackend(dictPath: bundledDict.path)
    os_log(.debug, "finish creating backend")
    return backend
}
