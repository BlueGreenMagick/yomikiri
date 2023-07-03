//
//  OptionsView.swift
//  Yomikiri (iOS)
//
//  Created by Yoonchae Lee on 2023/07/03.
//

import SwiftUI

struct OptionsView: View {
    var body: some View {
        VStack {
            WebView(url: Bundle.main.url(forResource: "options", withExtension: "html", subdirectory: "res")!){v in
                1}
        }
    }
}

struct OptionsView_Previews: PreviewProvider {
    static var previews: some View {
        OptionsView()
    }
}
