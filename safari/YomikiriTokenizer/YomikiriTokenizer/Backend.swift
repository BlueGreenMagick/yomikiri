//
//  Backend.swift
//  YomikiriTokenizer
//
//  Created by Yoonchae Lee on 2023/07/10.
//

import Foundation

public class Backend {
    /// it is never nil
    private var rust: RustBackend?

    private init(_ rust: RustBackend) {
        self.rust = rust
    }

    public static func create() throws -> Backend {
        let rust = try createRustBackend()
        return Backend(rust)
    }

    public func tokenize(sentence: String, charAt: UInt32) throws -> RawTokenizeResult {
        return try self.rust!.tokenize(sentence: sentence, charAt: charAt)
    }

    public func search(term: String, charAt: UInt32) throws -> RawTokenizeResult {
        return try self.rust!.search(term: term, charAt: charAt)
    }

    /// Update dictionary files, and update dictionary used within backend.
    ///
    /// May throw an error
    public func updateDictionary() throws -> DictMetadata {
        let tempDir = FileManager.default.temporaryDirectory
        let userDict = try DictUrls.user.get()
        // drop backend to close mmap and open file handle
        self.rust = nil
        let replaceJob = try updateDictionaryFile(tempDir: tempDir.path)
        let rust: RustBackend
        do {
            rust = try replaceJob.replace(indexPath: userDict.index.path, entriesPath: userDict.entries.path, metadataPath: userDict.metadata.path)
        } catch {
            // using restored user dictionary
            rust = try createRustBackend()
        }
        self.rust = rust
        let metadata = try getDictionaryMetadata()
        return metadata
    }
}

private func createRustBackend() throws -> RustBackend {
    if let userDict = try? validateAndGetUserDict() {
        if let rust = try? RustBackend(indexPath: userDict.index.path, entriesPath: userDict.entries.path) {
            return rust
        }
    }
    let bundledDict = try DictUrls.bundled.get()
    return try RustBackend(indexPath: bundledDict.index.path, entriesPath: bundledDict.entries.path)
}
