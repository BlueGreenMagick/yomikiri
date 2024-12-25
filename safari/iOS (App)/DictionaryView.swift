//
//  DictionaryView.swift
//  Yomikiri (iOS)
//
//  Created by Yoonchae Lee on 2023/08/25.
//

import SwiftUI

private let URL_DICT_DIR = Bundle.main.url(forResource: "dictionary", withExtension: "html", subdirectory: "res")!

struct DictionaryView: View {
    static let BACKGROUND_COLOR = Color(red: 0.95, green: 0.95, blue: 0.95)
    static let URL_DICTIONARY =
        URL_DICT_DIR.withPathComponents([URLQueryItem(name: "context", value: "app")])!

    var body: some View {
        YomikiriWebView(url: DictionaryView.URL_DICTIONARY)
            .onLoadFail { error in
                errorHandler.handle(error)
            }
            .scrollable(false)
            .overscroll(false)
            .background(DictionaryView.BACKGROUND_COLOR)
            .ignoresSafeArea(.keyboard)
    }
}
