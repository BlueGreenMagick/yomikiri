//
//  DictionaryView.swift
//  Yomikiri (iOS)
//
//  Created by Yoonchae Lee on 2023/08/25.
//

import SwiftUI

struct DictionaryView: View {
    @StateObject var viewModel = ViewModel()

    static let BACKGROUND_COLOR = Color(red: 0.95, green: 0.95, blue: 0.95)

    var body: some View {
        YomikiriWebView(viewModel: self.viewModel.webViewModel)
            .scrollable(false)
            .overscroll(false)
            .background(DictionaryView.BACKGROUND_COLOR)
            .ignoresSafeArea(.keyboard)
    }

    class ViewModel: ObservableObject {
        let webViewModel: YomikiriWebView.ViewModel

        init() {
            let url = Bundle.main.url(forResource: "dictionary", withExtension: "html", subdirectory: "res")!
            guard let url = url.withPathComponents([URLQueryItem(name: "context", value: "app")]) else {
                fatalError("Unable to build url")
            }
            self.webViewModel = .init(url: url)
        }
    }
}
