//
//  App.swift
//  Yomikiri (iOS)
//
//  Created by Yoonchae Lee on 2023/07/03.
//

import os.log
import SwiftUI

@main
struct YomikiriApp: App {
    @StateObject private var viewModel = ViewModel()
    @StateObject var errorHandler = ErrorHandler()

    var body: some Scene {
        return WindowGroup {
            MainView()
                .environmentObject(self.errorHandler)
                .alert("Error", isPresented: self.$errorHandler.showError, presenting: self.errorHandler.errorText) { _ in
                    Button("OK") {
                        self.errorHandler.showError = false
                    }
                } message: { text in
                    Text(text)
                }
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

class ErrorHandler: ObservableObject {
    @Published var showError = false
    @Published var errorText = ""

    func handle(_ err: Error) {
        os_log(.error, "%{public}s", err.localizedDescription)
        self.showError = true
        self.errorText = err.localizedDescription
    }
}
