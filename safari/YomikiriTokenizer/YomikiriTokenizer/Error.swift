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
    case InvalidBaseFile
    case IsNotValidUtf8(context: String)
}
