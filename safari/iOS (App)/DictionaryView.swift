//
//  DictionaryView.swift
//  Yomikiri (iOS)
//
//  Created by Yoonchae Lee on 2023/08/25.
//

import SwiftUI

struct DictionaryView: View {
    @StateObject var viewModel = ViewModel()

    static let BACKGROUND_COLOR = Color(red: 0.933, green: 0.933, blue: 0.933)

    var body: some View {
        WebView(viewModel: self.viewModel.webViewModel)
            .background(DictionaryView.BACKGROUND_COLOR)
    }

    class ViewModel: ObservableObject {
        let webViewModel: WebView.ViewModel

        init() {
            let url = Bundle.main.url(forResource: "dictionary", withExtension: "html", subdirectory: "res")!
            guard let url = url.withPathComponents([URLQueryItem(name: "context", value: "app")]) else {
                fatalError("Unable to build url")
            }
            self.webViewModel = .init(url: url, overscroll: false, scroll: false)
        }
    }
}
