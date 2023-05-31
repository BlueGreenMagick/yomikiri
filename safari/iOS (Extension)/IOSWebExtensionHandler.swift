//
//  SafariWebExtensionHandler.swift
//  Yomikiri Extension (iOS)
//
//  Created by Yoonchae Lee on 2023/05/19.
//

import SafariServices
import os.log

let SFExtensionMessageKey = "message"
let tokenizer = Tokenizer()
let appDir = try! FileManager.default.url(for:.applicationSupportDirectory, in:.userDomainMask, appropriateFor: nil, create: true).absoluteString
let anki = try! AnkiManager.tryNew(dbDir: appDir)


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
                break
            case "addNote":
                let noteData: NoteData = try jsonDeserialize(json: request)
                let nid = try anki.addNote(noteData: noteData)
                jsonResponse = try jsonSerialize(obj: nid)
                break
            case "deckNames":
                let names = try anki.deckNames()
                jsonResponse = try jsonSerialize(obj: names)
                break
            case "notetypeNames":
                let names = try anki.notetypeNames()
                jsonResponse = try jsonSerialize(obj: names)
                break
            case "notetypeFields":
                let name: String = try jsonDeserialize(json: request)
                let fields = try anki.notetypeFields(notetype: name)
                jsonResponse = try jsonSerialize(obj: fields)
                break
            case "ankiLogin":
                let authInfo: [String] = try jsonDeserialize(json: request)
                try anki.login(username: authInfo[0], password: authInfo[1])
                break
            case "ankiSync":
                try anki.sync()
                break
            case "ankiLogout":
                try anki.logout()
                break
            case "ankiLoginStatus":
                let status = try anki.loginStatus()
                jsonResponse = try jsonSerialize(obj: status)
                break
            case "ankiCheckConnection":
                try anki.checkConnection()
                break
            default:
                return
            }
            realResponse = ["success": true, "resp": jsonResponse]
        } catch {
            let errKind: String
            let errMessage: String
            if let ankiErr = error as? AnkiErr {
                errKind = ankiErr.variantName()
                errMessage = ankiErr.message()
            } else {
                errKind = "SwiftError"
                errMessage = error.localizedDescription
            }
            os_log(.error, "Error(%{public}s): %{public}s", errKind, errMessage)
            realResponse = ["success": false, "error": ["name": errKind, "message": errMessage]]
            
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

