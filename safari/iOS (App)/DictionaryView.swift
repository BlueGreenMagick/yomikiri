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
            WebView(viewModel: self.viewModel.webViewModel)
                .navigationTitle("Dictionary")
                .navigationBarTitleDisplayMode(.inline)
        }
        .navigationViewStyle(.stack)
    }

    class ViewModel: ObservableObject {
        let webViewModel: WebView.ViewModel

        init() {
            let url = Bundle.main.url(forResource: "dictionary", withExtension: "html", subdirectory: "res")!
            guard let url = url.withPathComponents([URLQueryItem(name: "context", value: "app")]) else {
                fatalError("Unable to build url")
            }
            self.webViewModel = .init(url: url, overscroll: false)
        }
    }
}
