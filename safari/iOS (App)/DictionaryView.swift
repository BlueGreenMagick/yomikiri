//
//  DictionaryView.swift
//  Yomikiri (iOS)
//
//  Created by Yoonchae Lee on 2023/08/25.
//

import SwiftUI

struct DictionaryView: View {
    @StateObject var viewModel = ViewModel()

    var body: some View {
        NavigationView {
            WebView(viewModel: viewModel.webViewModel)
                .navigationTitle("Dictionary")
                .navigationBarTitleDisplayMode(.inline)
        }
    }

    class ViewModel: ObservableObject {
        static let URL = Bundle.main.url(forResource: "dictionary", withExtension: "html", subdirectory: "res")!

        var webViewModel: WebView.ViewModel = .init(url: URL, overscroll: false)

        init() {
            webViewModel.runOnLoadComplete { [weak webViewModel] in
                guard let webview = webViewModel?.webview else {
                    return
                }
                webview.evaluateJavaScript("show('')")
            }
        }
    }
}
