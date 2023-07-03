//
//  App.swift
//  Yomikiri (iOS)
//
//  Created by Yoonchae Lee on 2023/07/03.
//

import SwiftUI

@main
struct YomikiriApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate
    
    var body: some Scene {
        print("app");
        return WindowGroup {
            OptionsView()
        }
    }
}
