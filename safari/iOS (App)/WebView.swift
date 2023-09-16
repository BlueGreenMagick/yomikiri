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
        let webview = UIYomikiriWebView(viewModel: viewModel.webviewModel)
        viewModel.webview = webview
        return webview
    }
    
    func updateUIView(_ webview: UIYomikiriWebView, context: Context) {}
    
    class ViewModel: ObservableObject {
        var webview: UIYomikiriWebView?
        let webviewModel: UIYomikiriWebView.ViewModel
        let url: URL
        fileprivate let additionalMessageHandler: AdditionalMessageHandler?
        fileprivate let overscroll: Bool
        private var loadCompleteRunnableFunctions: [() -> Void] = []
        
        /**
         ### Optional arguments
         - additionalMessageHandler: return nil if you want to let default message handler handle it. Return Optional(nil) if you want to return nil.
         */
        init(url: URL, additionalMessageHandler: AdditionalMessageHandler? = nil, overscroll: Bool = true) {
            self.url = url
            self.additionalMessageHandler = additionalMessageHandler
            self.overscroll = overscroll
            
            let webviewOptions = UIYomikiriWebView.ViewModel.Options(overscroll: overscroll, additionalMessageHandler: additionalMessageHandler, url: url)
            self.webviewModel = UIYomikiriWebView.ViewModel(options: webviewOptions)
        }
        
        func runOnLoadComplete(fn: @escaping (_ webview: UIYomikiriWebView) -> Void) {
            webviewModel.runOnLoadComplete(fn: fn)
        }
        
        func getLoadStatus() -> LoadStatus {
            return webviewModel.loadStatus
        }
    }
}
