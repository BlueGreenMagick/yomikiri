//
//  HelpItemView.swift
//  Yomikiri (iOS)
//
//  Created by Yoonchae Lee on 3/18/24.
//

import Combine
import SwiftUI

struct HelpItemView: View {
    @ObservedObject var viewModel: ViewModel
    let timer = Timer.publish(every: 1, on: .main, in: .common).autoconnect()
    let cancel: Cancellable? = nil

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
                Spacer()
                Image(self.viewModel.imageName)
                    .resizable()
                    .aspectRatio(contentMode: .fit)
                    .border(.gray)
                    .padding(4)
                    .id(self.viewModel.imageName)
                    .transition(.opacity.animation(.easeOut(duration: 0.5)))
                Spacer()
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
                .padding([.top, .bottom], 12)
                .multilineTextAlignment(.center)
        }
        .onAppear {
            viewModel.startImageTimer()
        }
        .onDisappear {
            viewModel.stopImageTimer()
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
        var timer: Timer? = nil

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

        func startImageTimer() {
            timer?.invalidate()
            timer = Timer.scheduledTimer(withTimeInterval: 3.0, repeats: true, block: { [weak self] tmr in
                guard let self = self else {
                    tmr.invalidate()
                    return
                }
                DispatchQueue.main.async {
                    withAnimation {
                        self.nextImage()
                    }
                }
            })
        }

        func stopImageTimer() {
            timer?.invalidate()
        }
    }
}

#Preview {
    let viewModel = HelpItemView.ViewModel("Some instruction", ["Help-1-1-1", "Help-1-1-2"], hasPrevItem: true, hasNextItem: false, prevItemClicked: {}, nextItemClicked: {})
    return HelpItemView(viewModel: viewModel)
}
