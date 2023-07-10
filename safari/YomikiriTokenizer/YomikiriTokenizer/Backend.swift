//
//  Backend.swift
//  YomikiriTokenizer
//
//  Created by Yoonchae Lee on 2023/07/10.
//

import Foundation

public func createBackend() throws -> Backend {
    let bundle = Bundle(identifier: "com.yoonchae.YomikiriTokenizer")!
    let indexPath = bundle.path(forResource: "english", ofType: "yomikiriindex")!
    let entriesPath = bundle.path(forResource: "english", ofType: "yomikiridict")!
    return try Backend(indexPath: indexPath, entriesPath: entriesPath)
}
