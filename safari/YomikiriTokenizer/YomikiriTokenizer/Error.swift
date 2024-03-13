//
//  Error.swift
//  YomikiriTokenizer
//
//  Created by Yoonchae Lee on 3/13/24.
//

import Foundation

enum YomikiriTokenizerError: Error {
    case CouldNotFindDocumentsDirectory
    case CalculateFileSizeError
    case RetrieveModificationDateError
    case BaseResourceNotFound
    case IsNotValidUtf8(context: String)
}

extension YomikiriTokenizerError: LocalizedError {
    var errorDescription: String? {
        switch self {
        case .CouldNotFindDocumentsDirectory:
            return "Could not find /documents directory"
        case .CalculateFileSizeError:
            return "Could not calculate file size"
        case .RetrieveModificationDateError:
            return "Could not retrieve file mod date"
        case .BaseResourceNotFound:
            return "App file could not be found. Please try reinstalling the app."
        case let .IsNotValidUtf8(ctx):
            return "Not a valid utf-8: \(ctx)"
        }
    }
}
