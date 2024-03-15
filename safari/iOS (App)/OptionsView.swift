//
//  OptionsView.swift
//  Yomikiri (iOS)
//
//  Created by Yoonchae Lee on 2023/07/03.
//

import os.log
import SwiftUI
import WebKit
import YomikiriTokenizer

struct OptionsView: View {
    @StateObject var viewModel = ViewModel()

    static let BACKGROUND_COLOR = Color(red: 0.933, green: 0.933, blue: 0.933)

    var body: some View {
        NavigationView {
            VStack {
                NavigationLink(isActive: self.$viewModel.ankiTemplateShown) {
                    WebView(viewModel: self.viewModel.ankiTemplateWebViewModel)
                        .navigationTitle("Anki Template")
                        .navigationBarTitleDisplayMode(.inline)
                        .ignoresSafeArea(.keyboard)
                } label: { EmptyView() }
                WebView(viewModel: self.viewModel.webViewModel)
                    .ignoresSafeArea(.keyboard)
            }
            .navigationTitle("Settings")
            .navigationBarTitleDisplayMode(.inline)
        }
        .navigationViewStyle(.stack)
        .background(OptionsView.BACKGROUND_COLOR)
        .onOpenURL(perform: self.handleOpenUrl)
    }

    init() {
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
                try viewModel.passAnkiInfo(ankiInfo: ankiInfo)
            } catch {
                os_log(.error, "ERROR %{public}s", error.localizedDescription)
            }
        }
    }
}

extension OptionsView {
    class ViewModel: ObservableObject {
        @Published var ankiTemplateShown: Bool = false

        static let htmlURL = Bundle.main.url(forResource: "options", withExtension: "html", subdirectory: "res")!
        static let ankiTemplateURL = Bundle.main.url(forResource: "optionsAnkiTemplate", withExtension: "html", subdirectory: "res")!

        var webViewModel: WebView.ViewModel!
        var ankiTemplateWebViewModel: WebView.ViewModel!

        init() {
            self.webViewModel = WebView.ViewModel(url: ViewModel.htmlURL, additionalMessageHandler: self.makeMessageHandler())
            self.ankiTemplateWebViewModel = WebView.ViewModel(url: ViewModel.ankiTemplateURL, additionalMessageHandler: self.makeMessageHandler())
        }

        func passAnkiInfo(ankiInfo: String) throws {
            let escaped = ankiInfo.replacingOccurrences(of: "`", with: "\\`")
            let script = """
            setTimeout(() => {
                AnkiApi.setAnkiInfo(`\(escaped)`);
            }, 50);
            """
            if webViewModel.getLoadStatus() == .complete {
                guard let webview = ankiTemplateWebViewModel.webview else {
                    throw "Webview not initialized"
                }
                webview.evaluateJavaScript(script)
            } else {
                webViewModel.runOnLoadComplete(fn: { (webview: UIYomikiriWebView) in
                    webview.evaluateJavaScript(script)
                })
            }
        }

        private func makeMessageHandler() -> WebView.AdditionalMessageHandler {
            { [weak self] (key: String, _: Any) in
                switch key {
                    case "ankiIsInstalled":
                        let val = ankiIsInstalled()
                        return try jsonSerialize(obj: val)
                    case "ankiInfo":
                        if let val = self?.requestAnkiInfo() {
                            return try jsonSerialize(obj: val)
                        } else {
                            return nil
                        }
                    default:
                        return nil
                }
            }
        }

        private func requestAnkiInfo() -> Bool {
            let url = URL(string: "anki://x-callback-url/infoForAdding?x-success=yomikiri://ankiInfo")!
            if !ankiIsInstalled() {
                return false
            }
            DispatchQueue.main.async {
                self.ankiTemplateShown = true
                UIApplication.shared.open(url)
            }
            return true
        }
    }
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
