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

private let WEB_MESSAGE_HANDLER_NAME = "yomikiri"

struct WebView: UIViewRepresentable {
    @ObservedObject var viewModel: ViewModel
    
    func makeUIView(context: Context) -> WKWebView {
        let webConfiguration = WKWebViewConfiguration()
        webConfiguration.setValue(true, forKey: "_allowUniversalAccessFromFileURLs")
        webConfiguration.userContentController.addScriptMessageHandler(context.coordinator, contentWorld: .page, name: WEB_MESSAGE_HANDLER_NAME)
        let webview = WKWebView(frame: .zero, configuration: webConfiguration)
        self.viewModel.webview = webview
        webview.navigationDelegate = context.coordinator
        
        let request = URLRequest(url: viewModel.url)
        webview.load(request)
        return webview
    }
    
    func updateUIView(_ webview: WKWebView, context: Context) {}
    
    func makeCoordinator() -> Coordinator {
        Coordinator(self, additionalMessageHandler: self.viewModel.additionalMessageHandler)
    }
    
    class ViewModel: ObservableObject {
        var webview: WKWebView?
        let additionalMessageHandler: AdditionalMessageHandler?
        let url: URL
        private var loadCompleteRunnableFunctions: [() -> Void] = []
        private var loadStatus: LoadStatus = .loading
        
        /**
         additionalMessageHandler: return nil if you want to let default message handler handle it. Return Optional(nil) if you want to return nil.
         */
        init(url: URL, additionalMessageHandler: AdditionalMessageHandler? = nil) {
            self.url = url
            self.additionalMessageHandler = additionalMessageHandler
        }
        
        func runOnLoadComplete(fn: @escaping () -> Void) {
            self.loadCompleteRunnableFunctions.append(fn)
        }
        
        func getLoadStatus() -> LoadStatus {
            return self.loadStatus
        }
        
        func setLoadStatus(status: LoadStatus) {
            self.loadStatus = status
            if status == .complete {
                let functions = self.loadCompleteRunnableFunctions
                self.loadCompleteRunnableFunctions = []
                for function in functions {
                    function()
                }
            }
        }
    }
    
    typealias AdditionalMessageHandler = (String, Any) async throws -> Any??
    
    enum LoadStatus {
        case loading, complete, failed
    }
    
    class Coordinator: NSObject, WKNavigationDelegate, WKScriptMessageHandlerWithReply {
        let parent: WebView
        let additionalMessageHandler: AdditionalMessageHandler?
        
        init(_ parent: WebView, additionalMessageHandler: AdditionalMessageHandler? = nil) {
            self.parent = parent
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
        
        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            self.parent.viewModel.setLoadStatus(status: .complete)
        }

        func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
            self.parent.viewModel.setLoadStatus(status: .loading)
        }

        func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) {
            self.parent.viewModel.setLoadStatus(status: .failed)
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
            os_log("%{public}s", "handleMessage: \(key)")
            if let handler = self.additionalMessageHandler {
                if let val = try await handler(key, request) {
                    return val
                }
            }
            return try await self.defaultMessageHandler(key: key, request: request)
        }
        
        func defaultMessageHandler(key: String, request: Any) async throws -> Any? {
            switch key {
            case "ankiIsInstalled":
                return ankiIsInstalled()
            case "loadConfig":
                return try SharedStorage.loadConfig()
            case "saveConfig":
                guard let configJson = request as? String else {
                    throw "setConfig tequest body must be JSON string"
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
            default:
                throw "Unknown key \(key)"
            }
        }
    }
}
