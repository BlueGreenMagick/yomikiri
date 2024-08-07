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
