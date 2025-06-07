//
//  Error.swift
//  YomikiriTokenizer
//
//  Created by Yoonchae Lee on 3/13/24.
//

import Foundation

enum YomikiriTokenizerError: Error {
    case CouldNotAccessDirectory
    case CalculateFileSizeError
    case RetrieveModificationDateError
    case BaseResourceNotFound
    case CouldNotRetrieveUserDefaults
    case IsNotValidUtf8(context: String)
    case Database(_ context: String)
    /// Cannot access backend as dictionary is being updated
    case UpdatingDictionary
    /// `fatalError()`, but with error message that is shown to user.
    /// This is an error that should logically not occur.
    case Fatal(_ message: String)
}

extension YomikiriTokenizerError: LocalizedError {
    var errorDescription: String? {
        switch self {
        case .CouldNotAccessDirectory:
            return "Could not access app directory"
        case .CalculateFileSizeError:
            return "Could not calculate file size"
        case .RetrieveModificationDateError:
            return "Could not retrieve file mod date"
        case .BaseResourceNotFound:
            return "App file could not be found. Please try reinstalling the app."
        case .CouldNotRetrieveUserDefaults:
            return "Could not retrieve user defaults"
        case let .IsNotValidUtf8(ctx):
            return "Not a valid utf-8: \(ctx)"
        case let .Database(ctx):
            return "Failed to query database: \(ctx)"
        case .UpdatingDictionary:
            return "Dictionary is being updated. Please try again after update is finished."
        case let .Fatal(msg):
            return "Fatal: \(msg)"
        }
    }
}
