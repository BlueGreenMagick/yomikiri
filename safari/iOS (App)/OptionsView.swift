//
//  OptionsView.swift
//  Yomikiri (iOS)
//
//  Created by Yoonchae Lee on 2023/07/03.
//

import os.log
import SwiftUI
import WebKit

struct OptionsView: View {
    @ObservedObject var viewModel: ViewModel

    static let BACKGROUND_COLOR = Color(red: 0.933, green: 0.933, blue: 0.933)

    var body: some View {
        NavigationView {
            WebView(viewModel: self.viewModel.webViewModel).onOpenURL(perform: self.handleOpenUrl)
                .navigationTitle("Settings")
                .navigationBarTitleDisplayMode(.inline)
                .background(OptionsView.BACKGROUND_COLOR)
        }
    }

    init(viewModel: ViewModel) {
        self.viewModel = viewModel

        let appearance = UINavigationBarAppearance()
        appearance.shadowColor = .darkGray
        appearance.backgroundColor = UIColor(OptionsView.BACKGROUND_COLOR)

        UINavigationBar.appearance().standardAppearance = appearance
        UINavigationBar.appearance().scrollEdgeAppearance = appearance
    }

    private func handleOpenUrl(url: URL) {
        guard url.isAnkiInfo else {
            return
        }
        Task {
            do {
                let ankiInfo = try await getAnkiInfoFromPasteboard()
                try viewModel.openAnkiInfoModal(ankiInfo: ankiInfo)
            } catch {
                os_log(.error, "ERROR %{public}s", error.localizedDescription)
            }
        }
    }
}

extension OptionsView {
    class ViewModel: ObservableObject {
        static let htmlURL = Bundle.main.url(forResource: "options", withExtension: "html", subdirectory: "res")!

        var webViewModel = WebView.ViewModel(url: htmlURL, messageHandler: handleMessage)

        init() {}

        // ankiInfo: JSON string
        func openAnkiInfoModal(ankiInfo: String) throws {
            let escaped = ankiInfo.replacingOccurrences(of: "`", with: "\\`")
            let script = """
            setTimeout(() => {
                setAnkiInfo(`\(escaped)`);
                openAnkiInfoModal();
            }, 50);
            """
            if self.webViewModel.getLoadStatus() == .complete {
                guard let webview = self.webViewModel.webview else {
                    throw "Webview not initialized"
                }
                webview.evaluateJavaScript(script)
            } else {
                self.webViewModel.runOnLoadComplete(fn: {
                    guard let webview = self.webViewModel.webview else {
                        return
                    }
                    webview.evaluateJavaScript(script)
                })
            }
        }
    }
}

private func handleMessage(rawMsg: Any) async throws -> Any? {
    guard let msg = rawMsg as? [String: Any] else {
        throw "Invalid message format"
    }
    guard let key = msg["key"] as? String else {
        throw "Message does not have 'key'"
    }
    guard let request = msg["request"] else {
        throw "Message does not have 'request'"
    }

    os_log("%{public}s", "handleMessage: \(key)")
    switch key {
    case "ankiIsInstalled":
        return ankiIsInstalled()
    case "ankiInfo":
        return await requestAnkiInfo()
    case "loadConfig":
        return try SharedStorage.loadConfig()
    case "saveConfig":
        guard let configJson = request as? String else {
            throw "setConfig tequest body must be JSON string"
        }
        return try SharedStorage.saveConfig(configJson: configJson)
    default:
        throw "Unknown key \(key)"
    }
}

private func ankiIsInstalled() -> Bool {
    let url = URL(string: "anki://x-callback-url/infoForAdding")!
    return UIApplication.shared.canOpenURL(url)
}

private func requestAnkiInfo() async -> Bool {
    let url = URL(string: "anki://x-callback-url/infoForAdding?x-success=yomikiri://ankiInfo")!
    return await UIApplication.shared.open(url)
}

private func getAnkiInfoFromPasteboard() async throws -> String {
    let PASTEBOARD_TYPE = "net.ankimobile.json"
    var tries = 0
    var data: Data?
    // sometimes takes some time for clipboard data to appear
    while tries < 25 {
        if let d = UIPasteboard.general.data(forPasteboardType: PASTEBOARD_TYPE) {
            // clear clipboard
            UIPasteboard.general.setData(Data(), forPasteboardType: PASTEBOARD_TYPE)
            data = d
            break
        }
        try await Task.sleep(nanoseconds: 1000 * 1000)
        tries += 1
    }
    // tries >= 25
    guard let data = data else {
        throw "Anki data not found in clipboard"
    }
    guard let json = String(data: data, encoding: .utf8) else {
        throw "ankiInfoData could not be converted into JSON string"
    }
    return json
}
