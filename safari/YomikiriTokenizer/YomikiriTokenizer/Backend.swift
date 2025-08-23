//
//  Backend.swift
//  YomikiriTokenizer
//
//  Created by Yoonchae Lee on 2023/07/10.
//

import Foundation
import os.log

public var backend = Result { try Backend() }

public struct Backend {
    public var db: RustDatabase
    public lazy var backend = Result { try self.createRustBackend() }

    init() throws {
        self.db = try createRustDatabase()
    }

    private func createRustBackend() throws -> RustBackend {
        if let userDict = try? validateAndGetUserDict() {
            if let rust = try? RustBackend(dictPath: userDict.path, db: db) {
                return rust
            } else {
                os_log(.error, "Failed to create rust backend using user downloaded dictionary. Using bundled dictionary instead.")
            }
        }
        let bundledDict = try getBundledDictUrl()
        let backend = try RustBackend(dictPath: bundledDict.path, db: db)
        os_log(.debug, "finish creating backend")
        return backend
    }

    public mutating func updateDictionary() async throws -> Bool {
        let dir = try filesDirectory()

        let jmdictResult = try uniffiDownloadJmdict(dir: dir.path, etag: db.uniffiGetJmdictEtag())
        if case let .replace(etag: etag) = jmdictResult {
            try db.uniffiSetJmdictEtag(value: etag)
        }
        let jmnedictResult = try uniffiDownloadJmnedict(dir: dir.path, etag: db.uniffiGetJmnedictEtag())
        if case let .replace(etag: etag) = jmnedictResult {
            try db.uniffiSetJmnedictEtag(value: etag)
        }

        // drop backend to close mmap and open file handle
        backend = Result.failure(YomikiriTokenizerError.UpdatingDictionary)

        var err: (any Error)? = nil
        do {
            try uniffiCreateDictionary(dir: dir.path)
            try db.uniffiSetDictSchemaVer(value: uniffiDictSchemaVer())
        } catch {
            err = error
        }

        // this may result in using bundled dictionary if new user dictionary throws an error
        backend = Result { try self.createRustBackend() }

        if let err = err {
            throw err
        }
        return true
    }
}

private func createRustDatabase() throws -> RustDatabase {
    os_log(.debug, "create database start")
    guard let sharedDir = getSharedContainerURL() else {
        throw YomikiriTokenizerError.Fatal("Could not find directory to place app files")
    }
    let dbPath = sharedDir.appendingPathComponent("db.sql")
    let database = try RustDatabase.uniffiOpen(path: dbPath.path)
    let dbVer = try database.uniffiGetVersion()
    if dbVer == 0 {
        try migrateDatabaseFrom0(db: database)
    }
    os_log(.debug, "create database end")
    return database
}

/// Migrates RustDatabase from version 0 to version 1
func migrateDatabaseFrom0(db: RustDatabase) throws {
    os_log(.debug, "migrate db v0 start")
    let webConfig = try LegacyStorage.config.get()
    let jmdictEtag = try LegacyStorage.jmdictEtag.get()
    let jmnedictEtag = try LegacyStorage.jmnedictEtag.get()
    let dictSchemaVer = try LegacyStorage.dictSchemaVer.get().map { (val: Int) -> UInt16 in UInt16(val) }
    let data = MigrateFromV0Data(webConfig: webConfig, jmdictEtag: jmdictEtag, jmnedictEtag: jmnedictEtag, dictSchemaVer: dictSchemaVer)
    try db.uniffiMigrateFrom0(data: data)
    os_log(.debug, "migrate db v0 end")
}

private func getSharedContainerURL() -> URL? {
    return FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: APP_GROUP_ID)
}
