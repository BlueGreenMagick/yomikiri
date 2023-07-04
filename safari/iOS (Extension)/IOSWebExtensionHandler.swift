//
//  SafariWebExtensionHandler.swift
//  Yomikiri Extension (iOS)
//
//  Created by Yoonchae Lee on 2023/05/19.
//

import SafariServices
import os.log
import YomikiriTokenizer

let SFExtensionMessageKey = "message"
let tokenizer = Tokenizer()
let appDir = try! FileManager.default.url(for:.applicationSupportDirectory, in:.userDomainMask, appropriateFor: nil, create: true).absoluteString

extension String: Error {}

class IOSWebExtensionHandler: NSObject, NSExtensionRequestHandling {
    func beginRequest(with context: NSExtensionContext) {
        let item = context.inputItems[0] as! NSExtensionItem
        let data = item.userInfo?[SFExtensionMessageKey] as AnyObject?
        guard let key = data?["key"] as? String else {
            return
        }
        guard let request = data?["request"] as? String else {
            return
        }
        let realResponse: [String: Any]
        var jsonResponse: String = "null"
        
        do {
            switch(key) {
            case "tokenize":
                let text: String = try jsonDeserialize(json: request)
                let tokens = tokenizer.tokenize(sentence: text)
                jsonResponse = try jsonSerialize(obj: tokens)
            case "addNote":
                break
            default:
                return
            }
            realResponse = ["success": true, "resp": jsonResponse]
        } catch {
            os_log(.error, "Error: %{public}s", String(describing: error))
            realResponse = ["success": false, "error": ["message": error.localizedDescription]]
        }
        let resp = NSExtensionItem()
        resp.userInfo = [SFExtensionMessageKey: realResponse]
        context.completeRequest(returningItems: [resp], completionHandler: nil)

    }

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

