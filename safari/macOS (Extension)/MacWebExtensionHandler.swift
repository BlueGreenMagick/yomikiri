//
//  MacWebExtensionHandler.swift
//  Yomikiri Extension (macOS)
//
//  Created by Yoonchae Lee on 2023/05/21.
//

import SafariServices
import os.log

let SFExtensionMessageKey = "message"

class MacWebExtensionHandler: NSObject, NSExtensionRequestHandling {
    func beginRequest(with context: NSExtensionContext) {
        os_log(.default, "beginRequest")
    }
}
