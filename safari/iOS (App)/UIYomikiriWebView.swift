//
//  UIYomikiriWebView.swift
//  Yomikiri
//
//  Created by Yoonchae Lee on 2023/09/14.
//

import os.log
import UIKit
import WebKit
import YomikiriTokenizer

var configUpdatedHandlers: [(_ messageHandler: UIYomikiriWebView.MessageHandler?, _ configJSON: String) -> Void] = []

func triggerConfigUpdateHook(messageHandler: UIYomikiriWebView.MessageHandler?, configJSON: String) {
    for fn in configUpdatedHandlers {
        fn(messageHandler, configJSON)
    }
}

class UIYomikiriWebView: WKWebView, WKNavigationDelegate {
    private let WEB_MESSAGE_HANDLER_NAME = "yomikiri"

    // return nil if not handled, Optional.some(nil) if returning nil to webview
    public typealias AdditionalMessageHandler = (String, Any) async throws -> String??

    public enum LoadStatus {
        case initial, loading, complete, failed
    }

    private let messageHandler: MessageHandler
    private let viewModel: ViewModel

    public init(viewModel: ViewModel) {
        self.viewModel = viewModel
        self.messageHandler = MessageHandler(additionalMessageHandler: viewModel.additionalMessageHandler)
        let webConfiguration = WKWebViewConfiguration()
        webConfiguration.setValue(true, forKey: "_allowUniversalAccessFromFileURLs")
        webConfiguration.userContentController.addScriptMessageHandler(self.messageHandler, contentWorld: .page, name: self.WEB_MESSAGE_HANDLER_NAME)
        super.init(frame: .zero, configuration: webConfiguration)
        if #available(iOS 16.4, macOS 13.3, *) {
            self.isInspectable = true
        }
        self.navigationDelegate = self
        self.viewModel.webview = self

        if !self.viewModel.overscroll {
            self.scrollView.bounces = false
            self.scrollView.alwaysBounceHorizontal = false
        }
        self.scrollView.isScrollEnabled = self.viewModel.scroll

        let request = URLRequest(url: self.viewModel.url)
        self.load(request)
        configUpdatedHandlers.append { [weak self] (triggeringMessageHandler: MessageHandler?, _: String) in
            guard let self = self else {
                return
            }
            // the triggering webview is current webview
            if self.messageHandler === triggeringMessageHandler {
                return
            }

            DispatchQueue.main.async { [weak self] in
                self?.evaluateJavaScript("iosConfigUpdated()")
            }
        }
    }

    func webView(_ webView: WKWebView, didCommit navigation: WKNavigation!) {}

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        self.viewModel.loadStatus = .complete
    }

    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        self.viewModel.loadStatus = .failed
    }

    func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) {
        self.viewModel.loadStatus = .loading
    }

    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction) async -> WKNavigationActionPolicy {
        if navigationAction.request.url?.isFileURL == true {
            return WKNavigationActionPolicy.allow
        } else {
            return WKNavigationActionPolicy.cancel
        }
    }

    @available(*, unavailable)
    public required init?(coder decoder: NSCoder) {
        fatalError("Unsupported initialization of YomikiriWebView through coder")
    }

    class MessageHandler: NSObject, WKScriptMessageHandlerWithReply {
        let additionalMessageHandler: AdditionalMessageHandler?

        init(additionalMessageHandler: AdditionalMessageHandler?) {
            self.additionalMessageHandler = additionalMessageHandler
        }

        func userContentController(_ controller: WKUserContentController, didReceive: WKScriptMessage, replyHandler: @escaping (Any?, String?) -> Void) {
            let message = didReceive.body
            Task {
                do {
                    if let response = try await handleMessage(rawMsg: message) {
                        replyHandler(response, nil)
                    } else {
                        replyHandler(NSNull(), nil)
                    }

                } catch {
                    replyHandler(nil, error.localizedDescription)
                }
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
            guard let request = msg["request"] else {
                throw "Message does not have 'request'"
            }
            os_log("%{public}s", "handleMessage: \(key)")

            var additionallyHandled = false
            if let handler = self.additionalMessageHandler {
                if let resp = try await handler(key, request) {
                    return resp
                }
            }
            if !additionallyHandled {
                return try await self.defaultMessageHandler(key: key, request: request)
            }
        }

        /// Returns JSON string or nil
        private func defaultMessageHandler(key: String, request: Any) async throws -> String? {
            switch key {
            case "loadConfig":
                let configJson = try loadSharedConfig()
                return configJson
            case "saveConfig":
                guard let configJson = request as? String else {
                    throw "saveConfig tequest body must be JSON string"
                }
                try saveSharedConfig(configJson: configJson)
                triggerConfigUpdateHook(messageHandler: self, configJSON: configJson)

                return nil
            case "tokenize":
                guard let req = request as? NSDictionary else {
                    throw "'tokenize' request is not a Dictionary"
                }
                guard let text = req["text"] as? String else {
                    throw "'tokenize' request.text is not String"
                }
                guard let charAt = req["charAt"] as? UInt32 else {
                    throw "'tokenize' request.charAt is not UInt32"
                }
                let resp = try backend.tokenize(sentence: text, charAt: charAt)
                return try jsonSerialize(obj: resp)
            case "searchTerm":
                guard let term = request as? String else {
                    throw "'searchTerm' request is not string"
                }
                let resp = try backend.search(term: term)
                return try jsonSerialize(obj: resp)
            case "versionInfo":
                let appVersion = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String
                let versionInfo = [
                    "version": appVersion
                ]
                return try jsonSerialize(obj: versionInfo)
            case "updateDict":
                let resp = try updateDictionary()
                return try jsonSerialize(obj: resp)
            case "dictMetadata":
                let resp = try getDictionaryMetadata()
                return try jsonSerialize(obj: resp)
            case "ttsVoices":
                let resp = japaneseTtsVoices()
                return try jsonSerialize(obj: resp)
            case "tts":
                guard let reqJSON = request as? String else {
                    throw "'tts' request is not a JSON string"
                }
                let req: TTSRequest = try jsonDeserialize(json: reqJSON)
                try ttsSpeak(voice: req.voice, text: req.text)
                return nil
            default:
                throw "Unknown key \(key)"
            }
        }

        private struct TTSRequest: Decodable {
            var text: String
            var voice: TTSVoice?
        }
    }

    public class ViewModel {
        public struct Options {
            var overscroll: Bool
            let scroll: Bool
            let additionalMessageHandler: AdditionalMessageHandler?
            let url: URL
        }

        public weak var webview: UIYomikiriWebView? = nil

        fileprivate let overscroll: Bool
        fileprivate let scroll: Bool
        fileprivate let additionalMessageHandler: AdditionalMessageHandler?
        fileprivate let url: URL
        fileprivate var loadCompleteRunnableFunctions: [(UIYomikiriWebView) -> Void] = []

        fileprivate(set) var loadStatus: LoadStatus {
            didSet {
                if self.loadStatus == .complete {
                    let functions = self.loadCompleteRunnableFunctions
                    self.loadCompleteRunnableFunctions = []
                    for function in functions {
                        function(self.webview!)
                    }
                }
            }
        }

        init(options: Options) {
            self.overscroll = options.overscroll
            self.scroll = options.scroll
            self.additionalMessageHandler = options.additionalMessageHandler
            self.url = options.url
            self.loadStatus = .initial
        }

        public func runOnLoadComplete(fn: @escaping (_ webview: UIYomikiriWebView) -> Void) {
            if self.loadStatus == .complete {
                fn(self.webview!)
            } else {
                self.loadCompleteRunnableFunctions.append(fn)
            }
        }
    }
}
