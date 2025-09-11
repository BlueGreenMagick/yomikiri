//
//  MigrationView.swift
//  Yomikiri
//

import SwiftUI
import YomikiriTokenizer

struct MigrateGuardView<Content: View>: View {
    let content: () -> Content
    @State private var migrationRequired: Bool = false
    @State private var isLoaded: Bool = false

    init(@ViewBuilder content: @escaping () -> Content) {
        self.content = content
    }

    var body: some View {
        if !isLoaded {
            ProgressView()
                .onAppear {
                    checkMigrationRequired()
                }
        } else if migrationRequired {
            MigrateView(onFinish: {
                migrationRequired = false
            })
        } else {
            content()
        }
    }

    private func checkMigrationRequired() {
        Task {
            do {
                let required = try backend.get().db.uniffiRequiresUserMigration()
                await MainActor.run {
                    migrationRequired = required
                    isLoaded = true
                }
            } catch {
                await MainActor.run {
                    migrationRequired = false
                    isLoaded = true
                }
                errorHandler.handle(error)
            }
        }
    }
}

private struct MigrateView: View {
    static let URL_MIGRATE = Bundle.main.url(forResource: "migrate", withExtension: "html", subdirectory: "res")!

    var onFinish: () -> Void = {}

    var body: some View {
        YomikiriWebView(url: MigrateView.URL_MIGRATE)
            .handleExtraMessage(messageHandler())
            .onLoadFail { error in
                errorHandler.handle(error)
            }
            .scrollable(false)
            .overscroll(false)
            .background(DictionaryView.BACKGROUND_COLOR)
            .ignoresSafeArea(.keyboard)
    }

    func messageHandler() -> YomikiriWebView.ExtraMessageHandler {
        { (key: String, _: Any) in
            switch key {
                case "finishMigration":
                    let val = ankiIsInstalled()
                    onFinish()
                    return try jsonSerialize(obj: val)
                default:
                    return nil
            }
        }
    }
}
