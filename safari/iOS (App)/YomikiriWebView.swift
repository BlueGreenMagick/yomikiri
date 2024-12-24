//
//  WebView.swift
//  Yomikiri (iOS)
//
//  Created by Yoonchae Lee on 2023/07/03.
//

import Foundation
import os.log
import SwiftUI
import WebKit
import YomikiriTokenizer

var configUpdatedHandlers: [(_ coordinator: YomikiriWebView.Coordinator?, _ configJSON: String) -> Void] = []

var configMigrated: Bool = false

func triggerConfigUpdateHook(coordinator: YomikiriWebView.Coordinator?, configJSON: String) {
    for fn in configUpdatedHandlers {
        fn(coordinator, configJSON)
    }
}

private let WEB_MESSAGE_HANDLER_NAME = "yomikiri"

struct YomikiriWebView: UIViewRepresentable {
    enum LoadStatus {
        case initial, loading, complete, failed
    }

    // return nil if not handled, Optional.some(nil) if returning nil to webview
    typealias AdditionalMessageHandler = (String, Any) async throws -> String??

    @ObservedObject var viewModel: ViewModel

    var scrollable = true
    var overscroll = true

    func makeUIView(context: Context) -> WKWebView {
        let webview = makeWkWebview(context)
        viewModel.webview = webview
        return webview
    }

    func updateUIView(_ webview: WKWebView, context: Context) {
        webview.scrollView.isScrollEnabled = scrollable
    }

    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }

    private func makeWkWebview(_ context: Context) -> WKWebView {
        let coordinator = context.coordinator
        viewModel.loadStatus = .initial
        let webConfiguration = WKWebViewConfiguration()
        webConfiguration.setValue(true, forKey: "allowUniversalAccessFromFileURLs")
        webConfiguration.userContentController.addScriptMessageHandler(coordinator, contentWorld: .page, name: WEB_MESSAGE_HANDLER_NAME)
        let webview = WKWebView(frame: .zero, configuration: webConfiguration)
        if #available(iOS 16.4, macOS 13.3, *) {
            webview.isInspectable = true
        }
        webview.navigationDelegate = coordinator

        if !overscroll {
            webview.scrollView.bounces = false
            webview.scrollView.alwaysBounceHorizontal = false
        }
        webview.scrollView.isScrollEnabled = scrollable

        let request = URLRequest(url: viewModel.url)
        webview.load(request)
        configUpdatedHandlers.append { [weak coordinator] (triggeringCoordinator: Coordinator?, _: String) in
            guard let coordinator = coordinator else {
                return
            }
            // the triggering webview is current webview
            if coordinator === triggeringCoordinator {
                return
            }

            DispatchQueue.main.async { [weak webview] in
                webview?.evaluateJavaScript("iosConfigUpdated()")
            }
        }
        return webview
    }
}

extension YomikiriWebView {
    func scrollable(_ value: Bool) -> YomikiriWebView {
        var view = self
        view.scrollable = value
        return view
    }

    func overscroll(_ value: Bool) -> YomikiriWebView {
        var view = self
        view.overscroll = value
        return view
    }
}

extension YomikiriWebView {
    class ViewModel: ObservableObject {
        var webview: WKWebView?
        let url: URL
        fileprivate let additionalMessageHandler: AdditionalMessageHandler?
        private var loadCompleteHandlers: [(WKWebView) -> Void] = []
        private var loadStatusChangeHandlers: [(LoadStatus) -> Void] = []
        fileprivate(set) var loadStatus: LoadStatus {
            didSet {
                for fn in loadStatusChangeHandlers {
                    fn(loadStatus)
                }
                if loadStatus == .complete, let webview = webview {
                    for fn in loadCompleteHandlers {
                        fn(webview)
                    }
                }
            }
        }

        /**
         ### Optional arguments
         - additionalMessageHandler: return nil if you want to let default message handler handle it. Return Optional(nil) if you want to return nil.
         */
        init(url: URL, additionalMessageHandler: AdditionalMessageHandler? = nil) {
            self.url = url
            self.additionalMessageHandler = additionalMessageHandler
            self.loadStatus = .initial
        }

        func runOnLoadComplete(fn: @escaping (_ webview: WKWebView) -> Void) {
            loadCompleteHandlers.append(fn)
        }

        func getLoadStatus() -> LoadStatus {
            return loadStatus
        }

        func onLoadStatusChange(fn: @escaping (LoadStatus) -> Void) {
            loadStatusChangeHandlers.append(fn)
        }
    }

    class Coordinator: NSObject, WKScriptMessageHandlerWithReply, WKNavigationDelegate {
        var parent: YomikiriWebView

        init(_ parent: YomikiriWebView) {
            self.parent = parent
        }

        func userContentController(_ controller: WKUserContentController, didReceive: WKScriptMessage, replyHandler: @escaping (Any?, String?) -> Void) {
            let message = didReceive.body
            Task {
                let response: [String: Any]
                do {
                    let jsonOutput = try await handleMessage(rawMsg: message) ?? "null"
                    response = ["success": true, "resp": jsonOutput]
                } catch let error as BackendError {
                    response = ["success": false, "error": error.json()]
                } catch {
                    response = ["success": false, "error": ["message": error.localizedDescription]]
                }
                replyHandler(response, nil)
            }
        }

        /// Returns JSON string or nil
        private func handleMessage(rawMsg: Any) async throws -> String? {
            guard let msg = rawMsg as? [String: Any] else {
                throw "Invalid message format"
            }
            guard let key = msg["key"] as? String else {
                throw "Message does not have 'key'"
            }
            // request object in JSON
            guard let request = msg["request"] as? String else {
                throw "Message does not have 'request'"
            }
            os_log("%{public}s", "handleMessage: \(key)")

            if let handler = parent.viewModel.additionalMessageHandler {
                if let resp = try await handler(key, request) {
                    return resp
                }
            }
            return try await defaultMessageHandler(key: key, request: request)
        }

        /// Returns JSON string or nil
        private func defaultMessageHandler(key: String, request: String) async throws -> String? {
            switch key {
            case "loadConfig":
                let configJson = try Storage.config.get()
                return configJson
            case "saveConfig":
                let configJson = request
                try Storage.config.set(configJson)
                triggerConfigUpdateHook(coordinator: self, configJSON: configJson)
                return nil
            case "migrateConfig":
                if configMigrated {
                    return "false"
                } else {
                    configMigrated = true
                    return "true"
                }
            case "tokenize":
                let req: TokenizeRequest = try jsonDeserialize(json: request)
                return try Backend.get().tokenize(sentence: req.text, charAt: req.charAt ?? 0)
            case "searchTerm":
                let req: SearchRequest = try jsonDeserialize(json: request)
                return try Backend.get().search(term: req.term, charAt: req.charAt ?? 0)
            case "versionInfo":
                let appVersion = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String
                let versionInfo = [
                    "version": appVersion
                ]
                return try jsonSerialize(obj: versionInfo)
            case "updateDict":
                let resp = try await Backend.updateDictionary()
                return try jsonSerialize(obj: resp)
            case "getDictMetadata":
                let resp = try Backend.get().metadata()
                return try jsonSerialize(obj: resp)
            case "openLink":
                let urlString: String = try jsonDeserialize(json: request)
                guard let url = URL(string: urlString) else {
                    throw "'openLink' url is not valid: \(urlString)"
                }
                DispatchQueue.main.async {
                    // does nothing in ios action
                    openUrl(url)
                }
                return nil
            case "ttsVoices":
                let resp = japaneseTtsVoices()
                return try jsonSerialize(obj: resp)
            case "tts":
                let req: TTSRequest = try jsonDeserialize(json: request)
                try ttsSpeak(voice: req.voice, text: req.text)
                return nil
            default:
                throw "Unknown key \(key)"
            }
        }

        func webView(_ webView: WKWebView, didCommit navigation: WKNavigation!) {}

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            parent.viewModel.loadStatus = .complete
        }

        func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
            parent.viewModel.loadStatus = .failed
        }

        func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) {
            parent.viewModel.loadStatus = .loading
        }

        func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction) async -> WKNavigationActionPolicy {
            guard let url = navigationAction.request.url else {
                return WKNavigationActionPolicy.cancel
            }
            if url.isFileURL == true {
                return WKNavigationActionPolicy.allow
            } else {
                openUrl(url)
                return WKNavigationActionPolicy.cancel
            }
        }
    }
}

private struct TokenizeRequest: Decodable {
    var text: String
    var charAt: UInt32?
}

private struct SearchRequest: Decodable {
    var term: String
    var charAt: UInt32?
}

private struct TTSRequest: Decodable {
    var text: String
    var voice: TTSVoice?
}
