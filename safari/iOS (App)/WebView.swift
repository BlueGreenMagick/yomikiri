//
//  WebView.swift
//  Yomikiri (iOS)
//
//  Created by Yoonchae Lee on 2023/07/03.
//

import Foundation
import os.log
import SwiftUI

struct WebView: UIViewRepresentable {
    @ObservedObject var viewModel: ViewModel
    
    typealias LoadStatus = UIYomikiriWebView.LoadStatus
    typealias AdditionalMessageHandler = UIYomikiriWebView.AdditionalMessageHandler
    
    func makeUIView(context: Context) -> UIYomikiriWebView {
        let webview = UIYomikiriWebView(options: viewModel.options)
        webview.onLoadStatusChange(fn: viewModel.onLoadStatusChange)
        viewModel.webview = webview
        return webview
    }
    
    func updateUIView(_ webview: UIYomikiriWebView, context: Context) {}
    
    class ViewModel: ObservableObject {
        var webview: UIYomikiriWebView?
        let url: URL
        fileprivate let additionalMessageHandler: AdditionalMessageHandler?
        fileprivate let overscroll: Bool
        fileprivate let scroll: Bool
        fileprivate var loadCompleteHandlers: [(UIYomikiriWebView) -> Void] = []
        
        var options: UIYomikiriWebView.Options {
            UIYomikiriWebView.Options(overscroll: overscroll, scroll: scroll, additionalMessageHandler: additionalMessageHandler, url: url)
        }
        
        /**
         ### Optional arguments
         - additionalMessageHandler: return nil if you want to let default message handler handle it. Return Optional(nil) if you want to return nil.
         */
        init(url: URL, additionalMessageHandler: AdditionalMessageHandler? = nil, overscroll: Bool = true, scroll: Bool = true) {
            self.url = url
            self.additionalMessageHandler = additionalMessageHandler
            self.overscroll = overscroll
            self.scroll = scroll
        }
        
        func runOnLoadComplete(fn: @escaping (_ webview: UIYomikiriWebView) -> Void) {
            loadCompleteHandlers.append(fn)
        }
        
        func getLoadStatus() -> LoadStatus {
            guard let webview = webview else {
                return .initial
            }
            return webview.loadStatus
        }
        
        func onLoadStatusChange(status: LoadStatus) {
            guard let webview = webview else {
                return
            }
            if status == .complete {
                for fn in loadCompleteHandlers {
                    fn(webview)
                }
            }
        }
    }
}
