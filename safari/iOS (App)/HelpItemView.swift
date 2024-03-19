//
//  HelpItemView.swift
//  Yomikiri (iOS)
//
//  Created by Yoonchae Lee on 3/18/24.
//

import SwiftUI

struct HelpItemView: View {
    @ObservedObject var viewModel: ViewModel

    var body: some View {
        VStack {
            HStack {
                Button(
                    action: {
                        viewModel.prevItemClicked()
                    },
                    label: {
                        Image(systemName: "arrowshape.backward.fill")
                    }
                )
                .disabled(!self.viewModel.hasPrevItem)
                .padding(6)
                Image(self.viewModel.imageName)
                    .resizable()
                    .aspectRatio(contentMode: .fit)
                    .border(.gray)
                    .padding(4)
                    .id(self.viewModel.imageName)
                    .transition(.opacity.animation(.easeOut(duration: 0.5)))
                Button(
                    action: {
                        viewModel.nextItemClicked()
                    },
                    label: {
                        Image(systemName: "arrowshape.right.fill")
                    }
                )
                .disabled(!viewModel.hasNextItem)
                .padding(6)
            }
            Text(viewModel.description)
                .padding(4)
                .multilineTextAlignment(.center)
        }
        .task {
            Task {
                repeat {
                    try? await Task.sleep(nanoseconds: 3 * 1000 * 1000 * 1000)
                    withAnimation {
                        viewModel.nextImage()
                    }
                } while !Task.isCancelled
            }
        }
    }

    final class ViewModel: ObservableObject {
        let description: String
        let imageNames: [String]
        let hasPrevItem: Bool
        let hasNextItem: Bool
        let prevItemClicked: () -> Void
        let nextItemClicked: () -> Void
        @Published var imageIndex: Int

        var imageName: String {
            imageNames[imageIndex]
        }

        init(_ description: String, _ imageNames: [String], hasPrevItem: Bool, hasNextItem: Bool, prevItemClicked: @escaping () -> Void, nextItemClicked: @escaping () -> Void) {
            self.description = description
            self.imageNames = imageNames
            self.imageIndex = 0
            self.hasPrevItem = hasPrevItem
            self.hasNextItem = hasNextItem
            self.prevItemClicked = prevItemClicked
            self.nextItemClicked = nextItemClicked
        }

        func nextImage() {
            imageIndex += 1
            if imageIndex >= imageNames.count {
                imageIndex = 0
            }
        }
    }
}

#Preview {
    let viewModel = HelpItemView.ViewModel("Some instruction", ["help-1-1-1", "help-1-1-2"], hasPrevItem: true, hasNextItem: false, prevItemClicked: {}, nextItemClicked: {})
    return HelpItemView(viewModel: viewModel)
}
