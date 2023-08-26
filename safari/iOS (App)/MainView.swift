//
//  MainView.swift
//  Yomikiri (iOS)
//
//  Created by Yoonchae Lee on 2023/08/25.
//

import SwiftUI

struct MainView: View {
    var body: some View {
        TabView {
            DictionaryView()
                .tabItem {
                    Label("Dictionary", systemImage: "character.book.closed.fill")
                }
            OptionsView()
                .tabItem {
                    Label("Settings", systemImage: "gearshape.fill")
                }
        }
    }
}

struct MainView_Previews: PreviewProvider {
    static var previews: some View {
        MainView()
    }
}
