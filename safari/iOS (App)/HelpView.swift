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
            Picker("Table of Contents", selection: $viewModel.currentItemId.section) {
                ForEach(0 ..< ViewModel.sections.count, id: \.self) { idx in
                    Text(ViewModel.sections[idx].title).tag(idx)
                }
            }
            .onChange(of: viewModel.currentItemId.section) { _ in
                viewModel.currentItemId.item = 0
            }

            TabView(selection: $viewModel.currentItemId) {
                ForEach(0 ..< ViewModel.sections.count, id: \.self) { sectionIdx in
                    ForEach(0 ..< ViewModel.sections[sectionIdx].items.count, id: \.self) { itemIdx in
                        let id = ItemId(section: sectionIdx, item: itemIdx)
                        return HelpItemView(viewModel: viewModel.itemViewModel(id))
                            .padding([.bottom], 60)
                            .tag(id)
                            .id(id)
                    }
                }
            }
            .tabViewStyle(.page)
            .indexViewStyle(.page(backgroundDisplayMode: .always))

        }.padding(12)
    }

    final class ViewModel: ObservableObject {
        static let sections: [Section] = [
            Section(title: "Main App", items: [
                Item(description: "Type in Japanese text", images: ["Help-1-1-1", "Help-1-1-2"]),
                Item(description: "Select a word", images: ["Help-1-2-1", "Help-1-2-2"]),
                Item(description: "You can share text to Yomikiri.", images: ["Help-1-3-1", "Help-1-3-2", "Help-1-3-3"]),
            ]),
            Section(title: "Safari Extension", items: [
                Item(description: "Select aA in address bar", images: ["Help-2-1-1"]),
                Item(description: "Select 'Manage Extensions'", images: ["Help-2-2-1"]),
                Item(description: "Enable Yomikiri", images: ["Help-2-3-1", "Help-2-3-2"]),
                Item(description: "Tap Yomikiri, grant permission", images: ["Help-2-4-1"]),
                Item(description: "Tap to enable or disable Yomikiri", images: ["Help-2-5-1", "Help-2-5-2"]),
                Item(description: "Tap on a word to see its meanings", images: ["Help-2-6-1"]),
            ]),
            Section(title: "Anki", items: [
                Item(description: "Enable Anki integration", images: ["Help-3-1-1", "Help-3-1-2"]),
                Item(description: "Tap to retrieve metadata from AnkiMobile", images: ["Help-3-2-1"]),
                Item(description: "Configure your Anki template", images: ["Help-3-3-1"]),
                Item(description: "Add note to AnkiMobile", images: ["Help-3-4-1", "Help-3-4-2"]),
                Item(description: "Select a specific meaning to add", images: ["Help-3-5-1"]),
            ]),
        ]

        @Published var currentItemId: ItemId
        var cachedViewModels: [ItemId: HelpItemView.ViewModel] = [:]

        var currentSection: Section {
            ViewModel.sections[currentItemId.section]
        }

        init() {
            currentItemId = ItemId(section: 0, item: 0)
        }

        func itemViewModel(_ itemId: ItemId) -> HelpItemView.ViewModel {
            if let viewModel = cachedViewModels[itemId] {
                return viewModel
            }
            let item = itemId.value
            let nextId = itemId.next
            let prevId = itemId.prev

            let viewModel = HelpItemView.ViewModel(
                item.description, item.images,
                hasPrevItem: prevId != nil, hasNextItem: nextId != nil,
                prevItemClicked: { [weak self] in
                    guard let self = self, let prev = prevId else {
                        return
                    }
                    withAnimation {
                        self.currentItemId = prev
                    }

                }, nextItemClicked: { [weak self] in
                    guard let self = self, let next = nextId else {
                        return
                    }
                    withAnimation {
                        self.currentItemId = next
                    }
                })
            cachedViewModels[itemId] = viewModel
            return viewModel
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

struct ItemId: Hashable {
    var section: Int
    var item: Int
}

extension ItemId {
    var value: Item {
        HelpView.ViewModel.sections[section].items[item]
    }

    var next: ItemId? {
        let sections = HelpView.ViewModel.sections
        let lastItem: Bool = (item == sections[section].items.count - 1)
        if section == sections.count - 1, lastItem {
            return nil
        } else if lastItem {
            return ItemId(section: section + 1, item: 0)
        } else {
            return ItemId(section: section, item: item + 1)
        }
    }

    var prev: ItemId? {
        if section == 0, item == 0 {
            return nil
        } else if item == 0 {
            return ItemId(section: section - 1, item: HelpView.ViewModel.sections[section - 1].items.count - 1)
        } else {
            return ItemId(section: section, item: item - 1)
        }
    }
}

#Preview {
    HelpView(viewModel: HelpView.ViewModel())
}
