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
        WebView(viewModel: viewModel.webViewModel)
    }

    class ViewModel: ObservableObject {
        static let URL = Bundle.main.url(forResource: "dictionary", withExtension: "html", subdirectory: "res")!

        var webViewModel: WebView.ViewModel = .init(url: URL)
    }
}
