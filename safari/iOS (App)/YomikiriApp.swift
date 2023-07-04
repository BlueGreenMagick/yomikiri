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
            OptionsView(viewModel: viewModel.optionsViewModel)
                .onOpenURL { _ in
                    print("global")
                }
        }
    }

    class ViewModel: ObservableObject {
        var optionsViewModel = OptionsView.ViewModel()

        init() {}
    }
}
