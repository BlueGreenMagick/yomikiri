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
            var jsonResponse: String? = nil
            do {
                switch key {
                case "addNote":
                    break
                case "tts":
                    let req: TTSRequest = try jsonDeserialize(json: request)
                    try ttsSpeak(voice: req.voice, text: req.text)
                case "iosVersion":
                    let ver = ProcessInfo.processInfo.operatingSystemVersion
                    let iosVersion = IosVersion(major: ver.majorVersion, minor: ver.minorVersion, patch: ver.patchVersion)
                    jsonResponse = try jsonSerialize(obj: iosVersion)
                case "invokeApp":
                    var backendInstance = try backend.get()
                    jsonResponse = try backendInstance.backend.get().uniffiInvokeApp(command: request)
                case "invoke":
                    var backendInstance = try backend.get()
                    jsonResponse = try backendInstance.backend.get().uniffiInvoke(command: request)
                default:
                    throw "Invalid command key: \(key)"
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
