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

    /// Update dictionary files, and update dictionary used within backend.
    ///
    /// If an error occurs, tries to restore previous dictionary.
    public static func updateDictionary() async throws -> DictMetadata {
        let tempDir = FileManager.default.temporaryDirectory
        let userDict = try DictUrls.user.get()
        // update file in background thread
        let replaceJob = try await Task {
            try updateDictionaryFile(tempDir: tempDir.path)
        }.value

        // drop backend to close mmap and open file handle
        Backend.rust = Result.failure(YomikiriTokenizerError.UpdatingDictionary)
        do {
            let rust = try replaceJob.replace(dictPath: userDict.dict.path, metadataPath: userDict.metadata.path)
            Backend.rust = Result.success(rust)
        } catch {
            // using restored user dictionary
            Backend.rust = Result { try createRustBackend() }
        }
        let metadata = try getDictionaryMetadata()
        return metadata
    }
}

private func createRustBackend() throws -> RustBackend {
    os_log(.debug, "start creating backend")
    if let userDict = try? validateAndGetUserDict() {
        if let rust = try? RustBackend(dictPath: userDict.dict.path) {
            return rust
        }
    }
    let bundledDict = try DictUrls.bundled.get()
    let backend = try RustBackend(dictPath: bundledDict.dict.path)
    os_log(.debug, "finish creating backend")
    return backend
}
