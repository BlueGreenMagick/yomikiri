//
//  ActionViewController.swift
//  Yomikiri Action
//
//  Created by Yoonchae Lee on 2023/09/13.
//
import MobileCoreServices
import SwiftUI
import UIKit
import UniformTypeIdentifiers

class ActionViewController: UIViewController {
    @IBOutlet var container: UIView!
    weak var webview: UIYomikiriWebView!

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
    }

    // in ShareViewController
    override func viewDidLoad() {
        super.viewDidLoad()

        // this gets the incoming information from the share sheet
        guard let item = extensionContext?.inputItems.first as? NSExtensionItem else {
            return
        }
        guard let attachments = item.attachments else {
            return
        }

        var searchText = ""

        for attachment: NSItemProvider in attachments {
            if attachment.hasItemConformingToTypeIdentifier(UTType.text.identifier) {
                attachment.loadItem(forTypeIdentifier: UTType.text.identifier, options: nil, completionHandler: { item, _ in
                    guard let item = item as? String else {
                        return
                    }
                    searchText += item
                })
            }
        }

        OperationQueue.main.addOperation { [weak self] in
            guard let self = self else {
                return
            }
            let actionUrl = Bundle.main.url(forResource: "dictionary", withExtension: "html", subdirectory: "res")!
            let options = UIYomikiriWebView.ViewModel.Options(overscroll: true, additionalMessageHandler: nil, url: actionUrl)
            let webviewModel = UIYomikiriWebView.ViewModel(options: options)
            let webview = UIYomikiriWebView(viewModel: webviewModel)
            webview.frame = self.container.bounds
            webviewModel.runOnLoadComplete { wv in
                var escaped = searchText
                    .replacingOccurrences(of: "\\", with: "\\\\")
                    .replacingOccurrences(of: "'", with: "\\'")
                wv.evaluateJavaScript("show('\(escaped)')")
            }
            self.webview = webview
            self.container.addSubview(webview)
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
