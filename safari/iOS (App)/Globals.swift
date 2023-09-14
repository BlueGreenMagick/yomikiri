//
//  DeepLink.swift
//  Yomikiri (iOS)
//
//  Created by Yoonchae Lee on 2023/07/04.
//

import Foundation
import os.log
import SwiftUI
import YomikiriTokenizer

extension URL {
    var isDeeplink: Bool {
        return scheme == "yomikiri"
    }

    var isAnkiInfo: Bool {
        isDeeplink && host == "ankiInfo"
    }

    var isOptions: Bool {
        isDeeplink && host == "options"
    }
}

extension String: LocalizedError {
    public var errorDescription: String? { return self }
}

// this is computed lazily
let backend = try! newBackend()

private func newBackend() throws -> Backend {
    os_log(.error, "start creating backend")
    let result = try createBackend()
    os_log(.error, "finish creating backend")
    return result
}

func jsonSerialize<T: Encodable>(obj: T?) throws -> String {
    let encoder = JSONEncoder()
    let data = try encoder.encode(obj)
    return String(data: data, encoding: .utf8) ?? "null"
}

func jsonDeserialize<T: Decodable>(json: String) throws -> T {
    let decoder = JSONDecoder()
    return try decoder.decode(T.self, from: json.data(using: .utf8)!)
}

@available(iOSApplicationExtension, unavailable)
func ankiIsInstalled() -> Bool {
    let url = URL(string: "anki://x-callback-url/infoForAdding")!
    return UIApplication.shared.canOpenURL(url)
}
