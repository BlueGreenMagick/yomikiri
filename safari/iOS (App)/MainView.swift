//
//  MainView.swift
//  Yomikiri (iOS)
//
//  Created by Yoonchae Lee on 2023/08/25.
//

import SwiftUI

struct MainView: View {
    @State private var selectedTab = "Dictionary"

    var body: some View {
        TabView(selection: $selectedTab) {
            HelpView()
                .tabItem {
                    Label("Help", systemImage: "questionmark.circle")
                }
                .tag("Help")
            DictionaryView()
                .tabItem {
                    Label("Dictionary", systemImage: "character.book.closed.fill")
                }
                .tag("Dictionary")
            OptionsView()
                .tabItem {
                    Label("Settings", systemImage: "gearshape.fill")
                }
                .tag("Settings")
        }
        .onOpenURL { url in
            if url.isOptions {
                selectedTab = "Settings"
            }
        }
    }
}
