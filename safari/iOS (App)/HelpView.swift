//
//  HelpView.swift
//  Yomikiri (iOS)
//
//  Created by Yoonchae Lee on 3/18/24.
//

import SwiftUI

struct HelpView: View {
    @StateObject var viewModel = ViewModel()

    var body: some View {
        VStack(alignment: .center, spacing: 20) {
            Picker("Table of Contents", selection: $viewModel.currentSectionIndex) {
                ForEach(0 ..< ViewModel.sections.count, id: \.self) { idx in
                    Text(ViewModel.sections[idx].title).tag(idx)
                }
            }
            Image(viewModel.imageName)
                .resizable()
                .aspectRatio(contentMode: .fit)
                .border(.gray)
                .padding(10)
            Text(viewModel.description)
        }.padding(20)
            .task {
                Task {
                    repeat {
                        try? await Task.sleep(nanoseconds: 3 * 1000 * 1000 * 1000)
                        viewModel.nextImage()
                    } while !Task.isCancelled
                }
            }
    }

    final class ViewModel: ObservableObject {
        static let sections: [Section] = [
            Section(title: "Main App", items: [
                Item(description: "Type in Japanese text", images: ["help-1-1-1", "help-1-1-2"]),
            ]),
            Section(title: "Safari Extension", items: [
                Item(description: "Select aA in address bar", images: [""]),
            ]),
            Section(title: "Anki", items: [
                Item(description: "Go to Settings tab", images: [""]),
            ]),
        ]

        @Published var currentSectionIndex: Int
        @Published var currentItemIndex: Int
        @Published var currentImageIndex: Int

        var currentItem: Item {
            ViewModel.sections[currentSectionIndex].items[currentItemIndex]
        }

        var sectionTitle: String {
            ViewModel.sections[currentSectionIndex].title
        }

        var description: String {
            currentItem.description
        }

        var imageName: String {
            currentItem.images[currentImageIndex]
        }

        init() {
            currentSectionIndex = 0
            currentItemIndex = 0
            currentImageIndex = 0
        }

        func nextImage() {
            currentImageIndex += 1
            if currentImageIndex >= currentItem.images.count {
                currentImageIndex = 0
            }
        }
    }
}

struct Section: Hashable {
    var title: String
    var items: [Item]
}

struct Item: Hashable {
    var description: String
    var images: [String]
}

#Preview {
    HelpView(viewModel: HelpView.ViewModel())
}
