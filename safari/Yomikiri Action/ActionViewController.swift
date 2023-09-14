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
        if let item = extensionContext?.inputItems.first as? NSExtensionItem {
            if let attachments = item.attachments {
                for attachment: NSItemProvider in attachments {
                    if attachment.hasItemConformingToTypeIdentifier(UTType.text.identifier) {
                        attachment.loadItem(forTypeIdentifier: UTType.text.identifier, options: nil, completionHandler: { _, _ in
                            weak var weakContainer = self.container
                            weak var weakSelf = self
                            OperationQueue.main.addOperation {
                                if let strongContainer = weakContainer, let strongSelf = weakSelf {
                                    let actionUrl = Bundle.main.url(forResource: "dictionary", withExtension: "html", subdirectory: "res")!
                                    let options = UIYomikiriWebView.Options(overscroll: true, additionalMessageHandler: nil, url: actionUrl)
                                    let webview = UIYomikiriWebView(options: options)
                                    webview.frame = strongContainer.bounds
                                    strongSelf.webview = webview
                                    strongContainer.addSubview(webview)
                                }
                            }
                        })
                    }
                }
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
