//
//  DeepLink.swift
//  Yomikiri (iOS)
//
//  Created by Yoonchae Lee on 2023/07/04.
//

import AVFoundation
import Foundation
import os.log
import SwiftUI
import YomikiriTokenizer

extension URL {
    func withPathComponents(_ pathComponents: [URLQueryItem]) -> URL? {
        var components = URLComponents(url: self, resolvingAgainstBaseURL: true)
        components?.queryItems = pathComponents
        return components?.url
    }

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

func japaneseTtsVoices() -> [TTSVoice] {
    let voices = AVSpeechSynthesisVoice.speechVoices()
    let ttsVoices = voices.map { voice in
        let quality: Int
        switch voice.quality {
        case .default:
            quality = 100
        case .enhanced:
            quality = 200
        case .premium:
            quality = 300
        default:
            quality = 50
        }
        return TTSVoice(id: voice.identifier, name: voice.name, quality: quality)
    }
    return ttsVoices
}

func speak(voice: TTSVoice, text: String) throws {
    let utterance = AVSpeechUtterance(string: text)
    var voice = AVSpeechSynthesisVoice(identifier: voice.id)
    if voice == nil {
        voice = AVSpeechSynthesisVoice(language: "ja-JP")
    }
    guard let voice = voice else {
        throw "No Japanese voice found"
    }

    utterance.voice = voice
    let synthesizer = AVSpeechSynthesizer()
    synthesizer.speak(utterance)
}

struct TTSVoice: Codable {
    let id: String
    let name: String
    /// default: 100
    /// enhanced: 200
    /// premium: 300
    let quality: Int
}
