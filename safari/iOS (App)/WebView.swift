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
    let url: URL
    let messageHandler: MessageHandler
    @ObservedObject var viewModel: ViewModel
    
    
    func makeUIView(context: Context) -> WKWebView {
        let webConfiguration = WKWebViewConfiguration()
        webConfiguration.setValue(true, forKey: "_allowUniversalAccessFromFileURLs")
        webConfiguration.userContentController.addScriptMessageHandler(context.coordinator, contentWorld: .page, name: WEB_MESSAGE_HANDLER_NAME)
        let webview = WKWebView(frame: .zero, configuration: webConfiguration)
        viewModel.webview = webview
        
        let request = URLRequest(url: url)
        webview.load(request)
        return webview
    }
    
    func updateUIView(_ webview: WKWebView, context: Context) {
    }
    
    
    func makeCoordinator() -> Coordinator {
        Coordinator(self, messageHandler: messageHandler)
    }
    
    
    class ViewModel: ObservableObject {
        var webview: WKWebView?
        
        init() {
        }
    }
    
    
    
    typealias MessageHandler = (Any) async throws -> Any?
    
    class Coordinator: NSObject, WKUIDelegate, WKScriptMessageHandlerWithReply {
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
    }
}
