//
//  Utils.swift
//  YomikiriTokenizer
//
//  Created by Yoonchae Lee on 8/7/24.
//

import Foundation

let bundle = Bundle(for: Backend.self)

func jsonSerialize<T: Encodable>(_ obj: T?) throws -> String {
    let encoder = JSONEncoder()
    let data = try encoder.encode(obj)
    return String(data: data, encoding: .utf8) ?? "null"
}

func jsonDeserialize<T: Decodable>(_ json: String) throws -> T {
    let decoder = JSONDecoder()
    return try decoder.decode(T.self, from: json.data(using: .utf8)!)
}

extension Result {
    func ok() -> Success? {
        switch self {
        case .success(let value):
            return value
        case .failure:
            return nil
        }
    }

    func is_ok() -> Bool {
        switch self {
        case .success:
            return true
        case .failure:
            return false
        }
    }
}

func unimplemented<T>(message: String = "", file: StaticString = #file, line: UInt = #line) -> T {
    fatalError("unimplemented: \(message)", file: file, line: line)
}
