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
            Image("help-1-1-1")
                .resizable()
                .aspectRatio(contentMode: .fit)
                .border(.gray)
                .padding(10)
            Text(viewModel.description)
        }.padding(20)
    }

    class ViewModel: ObservableObject {
        static let sections: [Section] = [
            Section(title: "Main App", items: [
                Item(description: "Type in Japanese text", image: "help-1-1-1"),
            ]),
            Section(title: "Safari Extension", items: [
                Item(description: "Select aA in address bar", image: ""),
            ]),
            Section(title: "Anki", items: [
                Item(description: "Go to Settings tab", image: ""),
            ]),
        ]

        @Published var sectionLabel: String
        @Published var description: String
        @Published var imageName: String
        var currentSectionIndex: Int
        var currentItemIndex: Int

        init() {
            currentSectionIndex = 0
            currentItemIndex = 0
            sectionLabel = ""
            description = ""
            imageName = ""
            updateDisplay()
        }

        func updateDisplay() {
            let section = ViewModel.sections[currentSectionIndex]
            let item = section.items[currentItemIndex]
            sectionLabel = section.title
            description = item.description
            imageName = item.image
        }
    }
}

struct Section {
    var title: String
    var items: [Item]
}

struct Item {
    var description: String
    var image: String
}

#Preview {
    HelpView(viewModel: HelpView.ViewModel())
}
