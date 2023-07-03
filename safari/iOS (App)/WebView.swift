//
//  WebView.swift
//  Yomikiri (iOS)
//
//  Created by Yoonchae Lee on 2023/07/03.
//

import Foundation
import SwiftUI
import WebKit

struct WebView: UIViewRepresentable {
    let url: URL
    let messageHandler: (Any) throws -> Any
    
    func makeUIView(context: Context) -> WKWebView {
        let configs = WKWebViewConfiguration()
        configs.setValue(true, forKey: "_allowUniversalAccessFromFileURLs")
        let webview = WKWebView(frame: .zero, configuration: configs)
        
        let request = URLRequest(url: url)
        webview.load(request)
        return webview
    }
            
    func updateUIView(_ webview: WKWebView, context: Context) {
        
    }
    
    func makeCoordinator() -> Coordinator {
        Coordinator(self, messageHandler: messageHandler)
    }
    
    class Coordinator: NSObject, WKUIDelegate, WKScriptMessageHandlerWithReply {
        let parent: WebView
        let messageHandler: (Any) throws -> Any
        
        init(_ parent: WebView, messageHandler: @escaping (Any) throws -> Any) {
            self.parent = parent
            self.messageHandler = messageHandler
        }
        
        func userContentController(_ controller: WKUserContentController, didReceive: WKScriptMessage, replyHandler: (Any?, String?) -> Void) {
            do {
                let response = try messageHandler(didReceive.body)
                replyHandler(response, nil)
            } catch {
                replyHandler(nil, error.localizedDescription)
            }
        }
    }
}
