//
//  SafariWebExtensionHandler.swift
//  Yomikiri Extension (iOS)
//
//  Created by Yoonchae Lee on 2023/05/19.
//

import os.log
import SafariServices
import YomikiriTokenizer

let SFExtensionMessageKey = "message"
let backend = try! newBackend()

func newBackend() throws -> Backend {
    os_log(.error, "start creating backend")
    let result = try createBackend()
    os_log(.error, "finish creating backend")
    return result
}

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
        var jsonResponse = "null"

        do {
            switch key {
            case "tokenize":
                let req: TokenizeRequest = try jsonDeserialize(json: request)
                let result = try backend.tokenize(sentence: req.text, charIdx: req.charIdx)
                jsonResponse = try jsonSerialize(obj: result)
            case "search":
                let term: String = try jsonDeserialize(json: request)
                let result = try backend.search(term: term)
                jsonResponse = try jsonSerialize(obj: result)
            case "addNote":
                break
            case "loadConfig":
                // already stored in json
                jsonResponse = try SharedStorage.loadConfig()
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

private struct TokenizeRequest: Codable {
    var text: String
    var charIdx: UInt32
}
