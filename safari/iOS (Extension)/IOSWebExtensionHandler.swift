//
//  SafariWebExtensionHandler.swift
//  Yomikiri Extension (iOS)
//
//  Created by Yoonchae Lee on 2023/05/19.
//

import AVFoundation
import os.log
import SafariServices
import YomikiriTokenizer

let SFExtensionMessageKey = "message"

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
                let result = try backend.tokenize(sentence: req.text, charAt: req.charAt)
                jsonResponse = try jsonSerialize(obj: result)
            case "search":
                let req: SearchRequest = try jsonDeserialize(json: request)
                let result = try backend.search(term: req.term, charAt: req.charAt ?? 0)
                jsonResponse = try jsonSerialize(obj: result)
            case "addNote":
                break
            case "loadConfig":
                // already stored in json
                jsonResponse = try loadSharedConfig()
            case "saveConfig":
                let configJson = request
                try saveSharedConfig(configJson: request)
            case "tts":
                let req: TTSRequest = try jsonDeserialize(json: request)
                try ttsSpeak(voice: req.voice, text: req.text)
            case "iosVersion":
                let ver = ProcessInfo.processInfo.operatingSystemVersion
                let iosVersion = IosVersion(major: ver.majorVersion, minor: ver.minorVersion, patch: ver.patchVersion)
                jsonResponse = try jsonSerialize(obj: iosVersion)
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

private struct TokenizeRequest: Codable {
    var text: String
    var charAt: UInt32
}

private struct TTSRequest: Decodable {
    var text: String
    var voice: TTSVoice?
}

private struct SearchRequest: Decodable {
    var term: String
    var charAt: UInt32?
}

private struct IosVersion: Codable {
    var major: Int
    var minor: Int
    var patch: Int
}
