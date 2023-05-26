CREATE TABLE config (
  name TEXT NOT NULL UNIQUE PRIMARY KEY,
  value BLOB
);

PRAGMA user_version = 1;