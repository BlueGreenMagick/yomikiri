//
//  DeepLink.swift
//  Yomikiri (iOS)
//
//  Created by Yoonchae Lee on 2023/07/04.
//

import Foundation

extension URL {
  var isDeeplink: Bool {
    return scheme == "yomikiri"
  }

  var isAnkiInfo: Bool {
    isDeeplink && host == "ankiInfo"
  }
}

extension String: LocalizedError {
    public var errorDescription: String? { return self }
}
