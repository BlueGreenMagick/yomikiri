//
//  SafariWebExtensionHandler.swift
//  Yomikiri Extension (iOS)
//
//  Created by Yoonchae Lee on 2023/05/19.
//

import SafariServices
import os.log

let SFExtensionMessageKey = "message"

let tokenizer = Tokenizer();

class IOSWebExtensionHandler: NSObject, NSExtensionRequestHandling {
    func beginRequest(with context: NSExtensionContext) {
        let item = context.inputItems[0] as! NSExtensionItem
        let data = item.userInfo?[SFExtensionMessageKey] as AnyObject?
        guard let key = data?["key"] as? String else {
            return
        }
        var response: [String: Any] = [:]
        
        switch(key) {
        case "tokenize":
            guard let text = data?["text"] as? String else {
                return
            }
            let tokens = tokenizer.tokenize(sentence: text)
            response = ["tokens": [jsonSerialize(obj: tokens)]]
            break
        default:
            return
        }
        let resp = NSExtensionItem()
        resp.userInfo = [SFExtensionMessageKey: response]
        context.completeRequest(returningItems: [resp], completionHandler: nil)
    }

}

func jsonSerialize<T: Encodable>(obj: T?) -> String? {
    let encoder = JSONEncoder()
    do {
        let data = try encoder.encode(obj)
        return String(data: data, encoding: .utf8) ?? "null"
    } catch _ {
        return "null"
    }
}
