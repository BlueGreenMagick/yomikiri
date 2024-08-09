//
//  Backend.swift
//  YomikiriTokenizer
//
//  Created by Yoonchae Lee on 2023/07/10.
//

import Foundation

public class Backend {
    private var rust: RustBackend

    private init(_ rust: RustBackend) {
        self.rust = rust
    }

    public static func create() throws -> Backend {
        let dictUrls = try getDict()
        let rust = try RustBackend(indexPath: dictUrls.index.path, entriesPath: dictUrls.entries.path)
        return Backend(rust)
    }

    public func tokenize(sentence: String, charAt: UInt32) throws -> RawTokenizeResult {
        return try self.rust.tokenize(sentence: sentence, charAt: charAt)
    }

    public func search(term: String, charAt: UInt32) throws -> RawTokenizeResult {
        return try self.rust.search(term: term, charAt: charAt)
    }
}
