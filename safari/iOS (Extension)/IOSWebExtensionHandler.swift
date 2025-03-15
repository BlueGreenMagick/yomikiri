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
        let completionHandler = context.completeRequest
        Task {
            let realResponse: [String: Any]
            var jsonResponse = "null"
            do {
                switch key {
                // TODO: Remove 'run:' prefix and move to default instead
                case let cmd where cmd.hasPrefix("run:"):
                    let command = String(cmd.dropFirst("run:".count))
                    jsonResponse = try Backend.get().run(command: command, args: request)
                case "tokenize":
                    let req: TokenizeRequest = try jsonDeserialize(json: request)
                    jsonResponse = try Backend.get().tokenize(sentence: req.text, charAt: req.charAt)
                case "search":
                    let req: SearchRequest = try jsonDeserialize(json: request)
                    jsonResponse = try Backend.get().search(term: req.term, charAt: req.charAt ?? 0)
                case "addNote":
                    break
                case "loadConfig":
                    // already stored in json
                    jsonResponse = try Storage.config.get()
                case "saveConfig":
                    let configJson = request
                    try Storage.config.set(request)
                case "tts":
                    let req: TTSRequest = try jsonDeserialize(json: request)
                    try ttsSpeak(voice: req.voice, text: req.text)
                case "iosVersion":
                    let ver = ProcessInfo.processInfo.operatingSystemVersion
                    let iosVersion = IosVersion(major: ver.majorVersion, minor: ver.minorVersion, patch: ver.patchVersion)
                    jsonResponse = try jsonSerialize(obj: iosVersion)
                case "getDictMetadata":
                    jsonResponse = try Backend.get().metadata()
                default:
                    return
                }
                realResponse = ["success": true, "resp": jsonResponse]
            } catch let error as BackendError {
                os_log(.error, "Error: %{public}s", String(describing: error))
                realResponse = ["success": false, "error": error.json()]
            } catch {
                os_log(.error, "Error: %{public}s", String(describing: error))
                realResponse = ["success": false, "error": ["message": error.localizedDescription]]
            }
            let resp = NSExtensionItem()
            resp.userInfo = [SFExtensionMessageKey: realResponse]
            completionHandler([resp], nil)
        }
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
