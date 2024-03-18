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
            HStack {
                Button(
                    action: {
                        viewModel.prevItem()
                    },
                    label: {
                        Image(systemName: "arrowshape.backward.fill")
                    }
                )
                .disabled(!viewModel.hasPrevItem)
                .padding(6)
                Image(viewModel.imageName)
                    .resizable()
                    .aspectRatio(contentMode: .fit)
                    .border(.gray)
                    .padding(4)
                    .id(viewModel.imageName)
                    .transition(.opacity.animation(.easeInOut(duration: 0.5)))
                Button(
                    action: {
                        viewModel.nextItem()
                    },
                    label: {
                        Image(systemName: "arrowshape.right.fill")
                    }
                )
                .disabled(!viewModel.hasNextItem)
                .padding(6)
            }
            Text(viewModel.description)
        }.padding(12)
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
                Item(description: "Select aA in address bar", images: ["help-1-1-1"]),
            ]),
            Section(title: "Anki", items: [
                Item(description: "Go to Settings tab", images: ["help-1-1-1"]),
            ]),
        ]

        @Published var currentSectionIndex: Int
        @Published var currentItemIndex: Int
        @Published var currentImageIndex: Int

        var currentSection: Section {
            ViewModel.sections[currentSectionIndex]
        }

        var currentItem: Item {
            currentSection.items[currentItemIndex]
        }

        var sectionTitle: String {
            currentSection.title
        }

        var description: String {
            currentItem.description
        }

        var imageName: String {
            currentItem.images[currentImageIndex]
        }

        var hasNextItem: Bool {
            !(currentSectionIndex == ViewModel.sections.count - 1 && currentItemIndex == currentSection.items.count - 1)
        }

        var hasPrevItem: Bool {
            !(currentSectionIndex == 0 && currentItemIndex == 0)
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

        func nextItem() {
            if !hasNextItem {
                return
            }
            if currentItemIndex >= currentSection.items.count - 1 {
                currentSectionIndex += 1
                currentItemIndex = 0
                currentImageIndex = 0
            } else {
                currentItemIndex += 1
                currentImageIndex = 0
            }
        }

        func prevItem() {
            if !hasPrevItem {
                return
            }
            if currentItemIndex == 0 {
                currentSectionIndex -= 1
                currentItemIndex = currentSection.items.count - 1
                currentImageIndex = 0
            } else {
                currentItemIndex -= 1
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
