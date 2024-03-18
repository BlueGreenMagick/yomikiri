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
                Item(description: "Type in Japanese text", images: ["help-1-1-1", "help-1-1-2"]),
                Item(description: "Type in Japanese text", images: ["help-1-1-1", "help-1-1-2"]),
            ]),
            Section(title: "Safari Extension", items: [
                Item(description: "Select aA in address bar", images: ["help-1-1-1"]),
            ]),
            Section(title: "Anki", items: [
                Item(description: "Go to Settings tab", images: ["help-1-1-1"]),
            ]),
        ]

        @Published var currentItemId: ItemId

        var currentSection: Section {
            ViewModel.sections[currentItemId.section]
        }

        init() {
            currentItemId = ItemId(section: 0, item: 0)
        }

        func itemViewModel(_ itemId: ItemId) -> HelpItemView.ViewModel {
            let item = itemId.value
            let nextId = itemId.next
            let prevId = itemId.prev

            return HelpItemView.ViewModel(
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
