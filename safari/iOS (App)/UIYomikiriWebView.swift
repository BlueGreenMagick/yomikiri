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

class UIYomikiriWebView: WKWebView, WKNavigationDelegate {
    private let WEB_MESSAGE_HANDLER_NAME = "yomikiri"

    // return nil if not handled, Optional(nil) if returning nil to webview
    public typealias AdditionalMessageHandler = (String, Any) async throws -> Any??

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
    }

    func webview(_ webview: WKWebView, didCommit navigation: WKNavigation!) {}

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        self.viewModel.loadStatus = .complete
    }

    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        self.viewModel.loadStatus = .failed
    }

    func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) {
        self.viewModel.loadStatus = .loading
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
                    let response = try await handleMessage(rawMsg: message)
                    replyHandler(response, nil)
                } catch {
                    replyHandler(nil, error.localizedDescription)
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
            if let handler = self.additionalMessageHandler {
                if let val = try await handler(key, request) {
                    return val
                }
            }
            return try await self.defaultMessageHandler(key: key, request: request)
        }

        private func defaultMessageHandler(key: String, request: Any) async throws -> Any? {
            switch key {
            case "loadConfig":
                return try SharedStorage.loadConfig()
            case "saveConfig":
                guard let configJson = request as? String else {
                    throw "saveConfig tequest body must be JSON string"
                }
                return try SharedStorage.saveConfig(configJson: configJson)
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
                let rawResult = try backend.tokenize(sentence: text, charAt: charAt)
                return try jsonSerialize(obj: rawResult)
            case "searchTerm":
                guard let term = request as? String else {
                    throw "'searchTerm' request is not string"
                }
                return try backend.search(term: term)
            case "versionInfo":
                let appVersion = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String
                let versionInfo = [
                    "version": appVersion
                ]
                return versionInfo
            case "updateDict":
                return try updateDictionary()
            case "dictMetadata":
                return try getDictionaryMetadata()
            default:
                throw "Unknown key \(key)"
            }
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
