//
//  Platform.swift
//  Yomikiri (iOS)
//
//  Created by Yoonchae Lee on 3/19/24.
//

import Foundation
import UIKit

/** Opens url if run in app. If in extension, does nothing. */
@MainActor func openUrl(_ url: URL) {
    UIApplication.shared.open(url)
}
