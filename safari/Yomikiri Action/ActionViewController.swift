//
//  ActionViewController.swift
//  Yomikiri Action
//
//  Created by Yoonchae Lee on 2023/09/13.
//
import MobileCoreServices
import os.log
import SwiftUI
import UIKit
import UniformTypeIdentifiers

class ActionViewController: UIViewController {
    @IBOutlet var container: UIView!
    weak var webview: UIYomikiriWebView!

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
    }

    override func viewDidLoad() {
        super.viewDidLoad()

        // this gets the incoming information from the share sheet
        guard let item = extensionContext?.inputItems.first as? NSExtensionItem else {
            return
        }
        guard let attachments = item.attachments else {
            return
        }

        Task { @MainActor in
            let searchText = await self.getSearchText(attachments: attachments)

            let actionUrl = Bundle.main.url(forResource: "dictionary", withExtension: "html", subdirectory: "res")!
            let pathComponents = [URLQueryItem(name: "context", value: "action"), URLQueryItem(name: "search", value: searchText)]
            guard let url = actionUrl.withPathComponents(pathComponents) else {
                os_log(.error, "Could not add path components to action url")
                return
            }
            self.createWebView(url: url)
        }
    }

    func getSearchText(attachments: [NSItemProvider]) async -> String {
        var searchText = ""

        for attachment: NSItemProvider in attachments {
            if attachment.hasItemConformingToTypeIdentifier(UTType.text.identifier) {
                let item = try? await attachment.loadItem(forTypeIdentifier: UTType.text.identifier, options: nil)
                guard let item = item as? String else {
                    continue
                }
                searchText += item
            }
        }
        return searchText
    }

    @MainActor func createWebView(url: URL) {
        let options = UIYomikiriWebView.ViewModel.Options(overscroll: false, additionalMessageHandler: self.makeMessageHandler(), url: url)
        let webviewModel = UIYomikiriWebView.ViewModel(options: options)
        let webview = UIYomikiriWebView(viewModel: webviewModel)
        webview.frame = self.container.bounds
        self.webview = webview
        self.container.addSubview(webview)
    }

    private func makeMessageHandler() -> UIYomikiriWebView.AdditionalMessageHandler {
        { [weak self] (key: String, _: Any) in
            switch key {
                case "close":
                    self?.done()
                    return Optional(nil)
                default:
                    return nil
            }
        }
    }

    @IBAction func done() {
        // Return any edited content to the host app.
        // This template doesn't do anything, so we just echo the passed in items.
        self.extensionContext!.completeRequest(returningItems: self.extensionContext!.inputItems, completionHandler: nil)
    }
}

struct SwiftUIView: View {
    @State public var incoming_text: String

    var body: some View {
        Text(self.incoming_text)
    }
}
