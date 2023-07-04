//
//  GlobalState.swift
//  Yomikiri (iOS)
//
//  Created by Yoonchae Lee on 2023/07/04.
//

import Foundation

class GlobalState: ObservableObject {
    @Published var state: State = State.options
    // in JSON
    @Published var ankiInfo: String?
    
    enum State {
        case options
    }
}
