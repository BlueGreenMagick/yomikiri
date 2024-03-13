//
//  Backend.swift
//  YomikiriTokenizer
//
//  Created by Yoonchae Lee on 2023/07/10.
//

import Foundation

public func createBackend() throws -> Backend {
    let (indexPath, entriesPath) = try getDictionaryPath()
    return try Backend(indexPath: indexPath, entriesPath: entriesPath)
}
