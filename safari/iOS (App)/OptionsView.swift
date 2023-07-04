//
//  OptionsView.swift
//  Yomikiri (iOS)
//
//  Created by Yoonchae Lee on 2023/07/03.
//

import SwiftUI
import WebKit

struct OptionsView: View {
    @EnvironmentObject var globalState: GlobalState
    @ObservedObject var viewModel: ViewModel
    
    var body: some View {
        WebView(url: Bundle.main.url(forResource: "options", withExtension: "html", subdirectory: "res")!, messageHandler: self.handleMessage, viewModel: viewModel.webViewModel)
            .onOpenURL(perform: handleOpenUrl)
    }
}

extension OptionsView {
    class ViewModel: ObservableObject {
        var webViewModel = WebView.ViewModel()
        
        init() {
        }
        
        // ankiInfo: JSON string
        func openAnkiInfoModal(ankiInfo: String) {
            let escaped = ankiInfo.replacingOccurrences(of: "`", with: "\\`")
            self.webViewModel.webview!.evaluateJavaScript("openAnkiInfoModal(`\(escaped)`)")
        }
    }
    
    func handleMessage(rawMsg: Any) async throws -> Any? {
        guard let msg = rawMsg as? [String: Any] else {
            throw "Invalid message format"
        }
        guard let key = msg["key"] as? String else {
            throw "Message does not have 'key'"
        }
        guard let request = msg["request"] else {
            throw "Message does not have 'request'"
        }
        print("handleMessage: \(key), \(request)")
        switch(key) {
        case "ankiIsInstalled":
            return ankiIsInstalled()
        case "ankiInfo":
            return await requestAnkiInfo()
        default:
            throw "Unknown key \(key)"
        }
    }
    
    func ankiIsInstalled() -> Bool {
        let url = URL(string: "anki://x-callback-url/infoForAdding")!
        return UIApplication.shared.canOpenURL(url)
    }
    
    func requestAnkiInfo() async -> Bool {
        let url = URL(string: "anki://x-callback-url/infoForAdding?x-success=yomikiri://ankiInfo")!
        return await UIApplication.shared.open(url)
    }
    
    func handleOpenUrl(url: URL) {
        guard url.isAnkiInfo else {
            return
        }
        Task {
            do {
                let ankiInfo = try await getAnkiInfoFromPasteboard()
                viewModel.openAnkiInfoModal(ankiInfo: ankiInfo)
            } catch {
                print(error)
            }
        }
    }
}

func getAnkiInfoFromPasteboard() async throws -> String {
    let PASTEBOARD_TYPE = "net.ankimobile.json"
    guard let sharedDefault = UserDefaults(suiteName: "group.com.bluegreenmagick.yomikiri") else {
        throw "Could not retrieve UserDefaults"
    }
    var tries = 0;
    var data: Data?
    // sometimes takes some time for clipboard data to appear
    while (tries < 25) {
        if let d = UIPasteboard.general.data(forPasteboardType: PASTEBOARD_TYPE) {
            // clear clipboard
            UIPasteboard.general.setData(Data(), forPasteboardType: PASTEBOARD_TYPE)
            data = d
            break;
        }
        try await Task.sleep(nanoseconds: 10 * 1000)
        tries += 1
    }
    // tries >= 25
    guard let data = data else {
        throw "Anki data not found in clipboard"
    }
    guard let json = String(data: data, encoding: .utf8) else {
        throw "ankiInfoData could not be converted into JSON string";
    }
    return json
}
