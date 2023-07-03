//
//  SceneDelegate.swift
//  iOS (App)
//
//  Created by Yoonchae Lee on 2023/04/27.
//

import UIKit
import os.log

extension String: LocalizedError {
    public var errorDescription: String? { return self }
}

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    
    var window: UIWindow?
    
    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        if let url = connectionOptions.urlContexts.first?.url {
            Task {
                await handleXCallbackUrl(url: url)
            }
        }
        guard let _ = (scene as? UIWindowScene) else { return }
    }
    
    func scene(
        _ scene: UIScene,
        openURLContexts urlContexts: Set<UIOpenURLContext>
    ) {
        guard let url = urlContexts.first?.url else {
            return
        }
        Task {
            await handleXCallbackUrl(url: url)
        }
    }
}

func handleXCallbackUrl(url: URL) async {
    // let openingProcess = urlContexts.first?.options.sourceApplication
    os_log(.default, "Opened url (scene): %{public}s", url.absoluteString)
    do {
        switch(url.path) {
        case "/infoForAdding":
            try await storeAnkiData()
            let yomikiriRedirectUrl = URL(string: "http://yomikiri-redirect.bluegreenmagick.com")!
            await UIApplication.shared.open(yomikiriRedirectUrl)
        default:
            os_log(.error, "No x-callback-url action found")
        }
    } catch {
        os_log(.error, "ERROR: %s", error.localizedDescription)
    }
}


// store anki info data into UserDefaults
func storeAnkiData() async throws {
    let PASTEBOARD_TYPE = "net.ankimobile.json"
    guard let sharedDefault = UserDefaults(suiteName: "group.com.bluegreenmagick.yomikiri") else {
        throw "Could not retrieve UserDefaults"
    }
    var tries = 0;
    var data: Data?
    // sometimes takes some time for clipboard data to appear
    while (tries < 25) {
        if let d = UIPasteboard.general.data(forPasteboardType: PASTEBOARD_TYPE) {
            // clear clipboard
            UIPasteboard.general.setData(Data(), forPasteboardType: PASTEBOARD_TYPE)
            data = d
            break;
        }
        try await Task.sleep(nanoseconds: 10 * 1000)
        tries += 1
    }
    if (tries == 25){
        throw "Anki data not found in clipboard"
    }
    
    // clear clipboard
    UIPasteboard.general.setData(Data(), forPasteboardType: PASTEBOARD_TYPE)
    sharedDefault.set(data!, forKey: "ankiInfo")
}
