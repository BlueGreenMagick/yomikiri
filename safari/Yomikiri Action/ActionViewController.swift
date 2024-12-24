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

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        os_log("loading...")

        // this gets the incoming information from the share sheet
        guard let item = extensionContext?.inputItems.first as? NSExtensionItem else {
            return
        }
        guard let attachments = item.attachments else {
            return
        }

        Task {
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

    func createWebView(url: URL) {
        let viewModel = YomikiriWebView.ViewModel(url: url, additionalMessageHandler: self.makeMessageHandler())
        let webview = YomikiriWebView(viewModel: viewModel).scrollable(false).overscroll(false)
        let contentView = UIHostingController(rootView: webview)
        self.addChild(contentView)
        self.container.addSubview(contentView.view)
        contentView.view.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            contentView.view.leadingAnchor.constraint(equalTo: self.container.leadingAnchor),
            contentView.view.trailingAnchor.constraint(equalTo: self.container.trailingAnchor),
            contentView.view.topAnchor.constraint(equalTo: self.container.topAnchor),
            contentView.view.bottomAnchor.constraint(equalTo: self.container.bottomAnchor)
        ])
    }

    private func makeMessageHandler() -> YomikiriWebView.AdditionalMessageHandler {
        { [weak self] (key: String, request: Any) in
            guard let self = self else {
                return nil
            }
            switch key {
                case "close":
                    self.done()
                    return Optional.some(nil)
                case "openLink":
                    guard let urlString = request as? String else {
                        throw "'openLink' url is not string"
                    }
                    guard let url = URL(string: urlString) else {
                        throw "'openLink' url is not valid: \(urlString)"
                    }
                    DispatchQueue.main.async {
                        self.openURL(url)
                    }
                    return Optional.some(nil)
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

    func openURL(_ url: URL) {
        guard let ctx = self.extensionContext else {
            return
        }
        ctx.open(url)
        var responder = self as UIResponder?
        let selectorOpenURL = sel_registerName("openURL:")
        while responder != nil {
            if responder?.responds(to: selectorOpenURL) == true {
                responder?.perform(selectorOpenURL, with: url)
            }
            responder = responder!.next
        }
    }
}

struct SwiftUIView: View {
    @State public var incoming_text: String

    var body: some View {
        Text(self.incoming_text)
    }
}
