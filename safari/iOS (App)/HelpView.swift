//
//  HelpView.swift
//  Yomikiri (iOS)
//
//  Created by Yoonchae Lee on 3/18/24.
//

import SwiftUI

struct HelpView: View {
    @StateObject var viewModel = ViewModel()

    var tocPickerBinding: Binding<Int> {
        Binding(
            get: { viewModel.currentItemId.section },
            set: { section in
                viewModel.currentItemId = ItemId(section: section, item: 0)
            }
        )
    }

    var body: some View {
        VStack(alignment: .center, spacing: 20) {
            Picker("Table of Contents", selection: tocPickerBinding) {
                ForEach(0 ..< ViewModel.sections.count, id: \.self) { idx in
                    Text(ViewModel.sections[idx].title).tag(idx)
                }
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
                Item(description: "Type in Japanese text", images: ["Help-1-1-1"]),
                Item(description: "Click on the word to select", images: ["Help-1-2-1", "Help-1-2-2"]),
            ]),
            Section(title: "Safari Extension", items: [
                Item(description: "Tap icon in address bar.", images: ["Help-2-1-1"]),
                Item(description: "Tap 'Manage Extensions'.", images: ["Help-2-2-1"]),
                Item(description: "Enable Yomikiri.", images: ["Help-2-3-1", "Help-2-3-2"]),
                Item(description: "Grant permission to access the website data.\nYou can change it later in the Settings app.\n'Settings > Safari > Extensions > Yomikiri > Permissions'.", images: ["Help-2-4-1"]),
                Item(description: "Tap on a word to see its meanings.", images: ["Help-2-5-1", "Help-2-5-2"]),
                Item(description: "You can temporarily disable Yomikiri.\nOpen extension popup and press the power button.", images: ["Help-2-6-1"]),
            ]),
            Section(title: "Share with Yomikiri", items: [
                Item(description: "Select text and share with Yomikiri.\nYou can even look up text on images by using built-in text recognition.", images: ["Help-3-1-1"]),
                Item(description: "Tap 'Yomikiri Action.", images: ["Help-3-2-1"]),
                Item(description: "Yomikiri sheet is shown.", images: ["Help-3-3-1"]),
            ]),
            Section(title: "Add note to Anki", items: [
                Item(description: "Enable Anki integration. AnkiMobile app must be installed on your device.", images: ["Help-4-1-1", "Help-4-1-2"]),
                Item(description: "Configure your Anki template. Notetype data will be retrieved from AnkiMobile.", images: ["Help-4-2-1"]),
                Item(description: "Tap '+' to view preview of Anki Note.\nTap 'Add' to add note to AnkiMobile.", images: ["Help-4-3-1", "Help-4-3-2"]),
                Item(description: "You can tap a meaning to add only that meaning to AnkiMobile.", images: ["Help-4-4-1"]),
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
            let prevItemClicked = itemId.prev.map { prevId in
                { [weak self] in
                    guard let self else {
                        return
                    }
                    withAnimation {
                        self.currentItemId = prevId
                    }
                }
            }
            let nextItemClicked = itemId.next.map { nextId in
                { [weak self] in
                    guard let self else {
                        return
                    }
                    withAnimation {
                        self.currentItemId = nextId
                    }
                }
            }

            let viewModel = HelpItemView.ViewModel(
                item.description,
                item.images,
                prevItemClicked: prevItemClicked,
                nextItemClicked: nextItemClicked
            )
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
