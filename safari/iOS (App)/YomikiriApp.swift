//
//  App.swift
//  Yomikiri (iOS)
//
//  Created by Yoonchae Lee on 2023/07/03.
//

import os.log
import SwiftUI
import YomikiriTokenizer

@main
struct YomikiriApp: App {
    @StateObject private var viewModel = ViewModel()
    @StateObject var appErrorHandler = errorHandler
    @StateObject var appState = AppState()

    var body: some Scene {
        return WindowGroup {
            MainView()
                .environmentObject(self.appState)
                .alert(
                    "Error", isPresented: self.$appErrorHandler.showError,
                    presenting: self.appErrorHandler.errorText
                ) { _ in
                    Button("OK") {}
                } message: { text in
                    Text(text)
                }
                .onOpenURL(perform: handleOpenUrl)
        }
    }

    @MainActor
    class ViewModel: ObservableObject {
        var optionsViewModel = OptionsView.ViewModel()

        init() {
            // fix bottom tab bar background changing when scrolled all the way down
            let tabBarAppearance = UITabBarAppearance()
            tabBarAppearance.configureWithDefaultBackground()
            UITabBar.appearance().scrollEdgeAppearance = tabBarAppearance
        }
    }

    func handleOpenUrl(url: URL) {
        if url.isOptions {
            appState.selectedTab = .settings
            return
        }
        if url.isAnkiInfo {
            appState.selectedTab = .settings
            appState.settingsNavigation = .ankiTemplate
            return
        }
    }
}

class ErrorHandler: ObservableObject {
    @Published var showError = false
    @Published var errorText = ""

    func handle(_ err: Error) {
        DispatchQueue.main.async {
            var description = err.localizedDescription
            if let backendErr = err as? BackendError {
                description += "\n" + backendErr.retrieveDetails().joined(separator: "\n")
            }
            os_log(.error, "%{public}s", description)
            self.showError = true
            self.errorText = description
        }
    }
}

@MainActor let errorHandler = ErrorHandler()

@MainActor
class AppState: ObservableObject {
    @Published var selectedTab: MainView.Tabs = .init()
    @Published var settingsNavigation: OptionsView.Navigation = .init()

    lazy var settingsNavigationIsAnkiTemplate: Binding<Bool> =
        Binding {
            self.settingsNavigation == .ankiTemplate
        } set: { value in
            if value, self.settingsNavigation != .ankiTemplate {
                self.settingsNavigation = .ankiTemplate
            } else if self.settingsNavigation == .ankiTemplate {
                self.settingsNavigation = .main
            }
        }
}
