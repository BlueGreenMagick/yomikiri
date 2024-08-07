//
//  Backend.swift
//  YomikiriTokenizer
//
//  Created by Yoonchae Lee on 2023/07/10.
//

import Foundation

public func createBackend() throws -> Backend {
    let dictUrls = try getDictionaryUrls()
    return try Backend(indexPath: dictUrls.index.path, entriesPath: dictUrls.entries.path)
}
