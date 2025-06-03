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

var configUpdatedHandlers: [(_ messageHandler: YomikiriWebView.MessageHandler?, _ configJSON: String) -> Void] = []

var configMigrated: Bool = false

func triggerConfigUpdateHook(messageHandler: YomikiriWebView.MessageHandler?, configJSON: String) {
    for fn in configUpdatedHandlers {
        fn(messageHandler, configJSON)
    }
}

private let WEB_MESSAGE_HANDLER_NAME = "yomikiri"

struct YomikiriWebView: UIViewRepresentable {
    enum LoadStatus {
        case initial, loading, complete, failed
    }

    /** return nil if you want to let other handlers (or default handler) handle it. Return Optional.some(nil) if you want to return nil to webview */
    typealias ExtraMessageHandler = (String, Any) async throws -> String??

    let url: URL

    let loadStatus: Box<LoadStatus> = .init(.initial)
    let extraMessageHandlers: Box<[ExtraMessageHandler]> = .init([])
    let loadCompleteHandlers: Box<[(WKWebView) -> Void]> = .init([])
    let loadFailHandlers: Box<[(Error) -> Void]> = .init([])
    let webview: WeakBox<WKWebView> = .init(nil)
    var scrollable = true
    var overscroll = true

    func makeUIView(context: Context) -> WKWebView {
        let webview = makeWkWebview(context)
        self.webview.value = webview
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
        let webConfiguration = WKWebViewConfiguration()
        webConfiguration.setValue(true, forKey: "allowUniversalAccessFromFileURLs")
        let messageHandler = MessageHandler(extraMessageHandlers)
        webConfiguration.userContentController.addScriptMessageHandler(messageHandler, contentWorld: .page, name: WEB_MESSAGE_HANDLER_NAME)
        let webview = WKWebView(frame: .zero, configuration: webConfiguration)

        webview.navigationDelegate = coordinator
        if #available(iOS 16.4, macOS 13.3, *) {
            webview.isInspectable = true
        }
        if !overscroll {
            webview.scrollView.bounces = false
            webview.scrollView.alwaysBounceHorizontal = false
        }
        webview.scrollView.isScrollEnabled = scrollable

        let request = URLRequest(url: url)
        webview.load(request)
        configUpdatedHandlers.append { [weak messageHandler, weak webview] (source: YomikiriWebView.MessageHandler?, _: String) in
            guard let handler = messageHandler else {
                return
            }
            // the triggering webview is current webview
            if handler === source {
                return
            }

            DispatchQueue.main.async {
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

    func handleExtraMessage(_ fn: @escaping ExtraMessageHandler) -> YomikiriWebView {
        extraMessageHandlers.value.append(fn)
        return self
    }

    func onLoadComplete(_ fn: @escaping (WKWebView) -> Void) -> YomikiriWebView {
        loadCompleteHandlers.value.append(fn)
        return self
    }

    func onLoadFail(_ fn: @escaping (Error) -> Void) -> YomikiriWebView {
        loadFailHandlers.value.append(fn)
        return self
    }
}

extension YomikiriWebView {
    class Coordinator: NSObject, WKNavigationDelegate {
        let loadStatus: Box<LoadStatus>
        let loadCompleteHandlers: Box<[(WKWebView) -> Void]>
        let loadFailHandlers: Box<[(Error) -> Void]>
        let webview: WeakBox<WKWebView>

        init(_ parent: YomikiriWebView) {
            self.loadStatus = parent.loadStatus
            self.loadCompleteHandlers = parent.loadCompleteHandlers
            self.loadFailHandlers = parent.loadFailHandlers
            self.webview = parent.webview
        }

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            setLoadStatus(.complete)
            for fn in loadCompleteHandlers.value {
                fn(webView)
            }
        }

        func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
            setLoadStatus(.failed)
            for fn in loadFailHandlers.value {
                fn(error)
            }
        }

        func webView(
            _ webView: WKWebView,
            didFailProvisionalNavigation navigation: WKNavigation!,
            withError error: any Error
        ) {
            setLoadStatus(.failed)
            for fn in loadFailHandlers.value {
                fn(error)
            }
        }

        func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) {
            setLoadStatus(.loading)
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

        private func setLoadStatus(_ newStatus: LoadStatus) {
            loadStatus.value = newStatus
        }
    }

    class MessageHandler: NSObject, WKScriptMessageHandlerWithReply {
        var extraMessageHandlers: Box<[ExtraMessageHandler]>

        init(_ extra: Box<[ExtraMessageHandler]>) {
            self.extraMessageHandlers = extra
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

            for handler in extraMessageHandlers.value {
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
                let configJson = try backend.get().db.getRawStorage(key: "web_config")
                return configJson
            case "saveConfig":
                let configJson = request
                try backend.get().db.setRawStorage(key: "web_config", value: configJson)
                triggerConfigUpdateHook(messageHandler: self, configJSON: configJson)
                return nil
            case "migrateConfig":
                if configMigrated {
                    return "false"
                } else {
                    configMigrated = true
                    return "true"
                }
            case "versionInfo":
                let appVersion = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String
                let versionInfo = [
                    "version": appVersion
                ]
                return try jsonSerialize(obj: versionInfo)
            case "updateDict":
                var backendInstance = try backend.get()
                let resp = try await backendInstance.updateDictionary()
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
                var backendInstance = try backend.get()
                var innerBackend = try backendInstance.backend.get()
                return try innerBackend.run(command: key, args: request)
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
