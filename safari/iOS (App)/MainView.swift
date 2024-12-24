//
//  MainView.swift
//  Yomikiri (iOS)
//
//  Created by Yoonchae Lee on 2023/08/25.
//

import SwiftUI

struct MainView: View {
    @EnvironmentObject var appState: AppState

    var body: some View {
        TabView(selection: $appState.selectedTab) {
            HelpView()
                .tabItem {
                    Label("Help", systemImage: "questionmark.circle")
                }
                .tag(Tabs.help)
            DictionaryView()
                .tabItem {
                    Label("Dictionary", systemImage: "character.book.closed.fill")
                }
                .tag(Tabs.dictionary)
            OptionsView()
                .tabItem {
                    Label("Settings", systemImage: "gearshape.fill")
                }
                .tag(Tabs.settings)
        }
        .onOpenURL { url in
            if url.isOptions {
                appState.selectedTab = .settings
            }
        }
    }

    enum Tabs {
        case help, dictionary, settings

        init() {
            self = .dictionary
        }
    }
}
