//
//  WebView.swift
//  Yomikiri (iOS)
//
//  Created by Yoonchae Lee on 2023/07/03.
//

import Foundation
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
        Coordinator(self, messageHandler: self.viewModel.messageHandler)
    }
    
    class ViewModel: ObservableObject {
        var webview: WKWebView?
        fileprivate let messageHandler: MessageHandler
        fileprivate let url: URL
        private var loadCompleteRunnableFunctions: [() -> Void] = []
        private var loadStatus: LoadStatus = .loading
        
        init(url: URL, messageHandler: @escaping MessageHandler) {
            self.url = url
            self.messageHandler = messageHandler
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
    
    typealias MessageHandler = (Any) async throws -> Any?
    
    enum LoadStatus {
        case loading, complete, failed
    }
    
    class Coordinator: NSObject, WKNavigationDelegate, WKScriptMessageHandlerWithReply {
        let parent: WebView
        let messageHandler: MessageHandler
        
        init(_ parent: WebView, messageHandler: @escaping MessageHandler) {
            self.parent = parent
            self.messageHandler = messageHandler
        }
        
        func userContentController(_ controller: WKUserContentController, didReceive: WKScriptMessage, replyHandler: @escaping (Any?, String?) -> Void) {
            let message = didReceive.body
            Task {
                do {
                    let response = try await messageHandler(message)
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
    }
}
