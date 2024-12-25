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
    @EnvironmentObject var errorHandler: ErrorHandler
    @EnvironmentObject var appState: AppState

    static let BACKGROUND_COLOR = Color(red: 0.95, green: 0.95, blue: 0.95)

    enum Navigation {
        case main, ankiTemplate

        init() {
            self = .main
        }
    }

    var body: some View {
        NavigationView {
            VStack {
                NavigationLink(isActive: self.appState.settingsNavigationIsAnkiTemplate) {
                    YomikiriWebView(viewModel: self.viewModel.ankiTemplateWebViewModel, additionalMessageHandler: self.viewModel.messageHandler())
                        .navigationTitle("Anki Template")
                        .navigationBarTitleDisplayMode(.inline)
                        .ignoresSafeArea(.keyboard)
                        .onAppear {
                            Task {
                                await self.retrieveAndPassAnkiInfo()
                            }
                        }
                } label: { EmptyView() }
                YomikiriWebView(viewModel: self.viewModel.webViewModel, additionalMessageHandler: self.viewModel.messageHandler())
                    .ignoresSafeArea(.keyboard)
            }
            .navigationTitle("Settings")
            .navigationBarTitleDisplayMode(.inline)
        }
        .navigationViewStyle(.stack)
        .background(OptionsView.BACKGROUND_COLOR)
    }

    init() {
        let appearance = UINavigationBarAppearance()
        appearance.shadowColor = .darkGray
        appearance.backgroundColor = UIColor(OptionsView.BACKGROUND_COLOR)

        UINavigationBar.appearance().standardAppearance = appearance
        UINavigationBar.appearance().scrollEdgeAppearance = appearance
    }

    func retrieveAndPassAnkiInfo() async {
        do {
            let ankiInfo = try await getAnkiInfoFromPasteboard()
            try viewModel.passAnkiInfo(ankiInfo: ankiInfo)
        } catch {
            self.errorHandler.handle(error)
        }
    }
}

extension OptionsView {
    @MainActor
    class ViewModel: ObservableObject {
        static let htmlURL = Bundle.main.url(forResource: "options", withExtension: "html", subdirectory: "res")!
        static let ankiTemplateURL = Bundle.main.url(forResource: "optionsAnkiTemplate", withExtension: "html", subdirectory: "res")!

        var webViewModel: YomikiriWebView.ViewModel!
        var ankiTemplateWebViewModel: YomikiriWebView.ViewModel!

        init() {
            self.webViewModel = YomikiriWebView.ViewModel(url: ViewModel.htmlURL)
            self.ankiTemplateWebViewModel = YomikiriWebView.ViewModel(url: ViewModel.ankiTemplateURL)
        }

        func passAnkiInfo(ankiInfo: String) throws {
            let escaped = ankiInfo.replacingOccurrences(of: "`", with: "\\`")
            let script = "setTimeout(() => {AnkiApi.setAnkiInfo(`\(escaped)`);}, 0)"
            ankiTemplateWebViewModel.runWhenLoadComplete(fn: { (webview: WKWebView) in
                webview.evaluateJavaScript(script)
            })
        }

        func messageHandler() -> YomikiriWebView.AdditionalMessageHandler {
            { [weak self] (key: String, _: Any) in
                switch key {
                    case "ankiIsInstalled":
                        let val = ankiIsInstalled()
                        return try jsonSerialize(obj: val)
                    case "ankiInfo":
                        if let val = self?.requestAnkiInfo() {
                            return try jsonSerialize(obj: val)
                        } else {
                            return Optional.some(nil)
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
            Task {
                await UIApplication.shared.open(url)
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
