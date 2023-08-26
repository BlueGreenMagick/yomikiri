//
//  App.swift
//  Yomikiri (iOS)
//
//  Created by Yoonchae Lee on 2023/07/03.
//

import SwiftUI

@main
struct YomikiriApp: App {
    @StateObject private var viewModel = ViewModel()

    var body: some Scene {
        return WindowGroup {
            MainView()
        }
    }

    class ViewModel: ObservableObject {
        var optionsViewModel = OptionsView.ViewModel()

        init() {
            // fix bottom tab bar background changing when scrolled all the way down
            let tabBarAppearance = UITabBarAppearance()
            tabBarAppearance.configureWithDefaultBackground()
            UITabBar.appearance().scrollEdgeAppearance = tabBarAppearance
        }
    }
}
