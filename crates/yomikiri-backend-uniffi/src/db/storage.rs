use std::borrow::Borrow;
use std::marker::PhantomData;

use anyhow::{Context, Result};
use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};

use crate::error::{FFIResult, ToUniFFIResult};

use super::{ConnectionTrait, RustDatabase};

#[derive(Clone, Copy, Debug)]
pub struct StorageKey<T> {
    key: &'static str,
    _value: PhantomData<T>,
}

impl<T> StorageKey<T>
where
    T: Serialize + for<'de> Deserialize<'de>,
{
    pub fn new(key: &'static str) -> StorageKey<T> {
        StorageKey {
            key,
            _value: PhantomData,
        }
    }

    pub fn get(&self, db: &Connection) -> Result<Option<T>> {
        get_storage(db, self.key)
    }

    pub fn set<R>(&self, db: &Connection, value: Option<R>) -> Result<()>
    where
        R: Borrow<T>,
        T: Serialize,
    {
        set_storage_optional(db, self.key, value)
    }
}

/// Used as namespace to hold static methods for all typed properties
pub struct KEYS {}

macro_rules! storage_key {
    ($name:ident, $type:ty) => {
        paste::paste! {
            impl KEYS {
                pub fn $name() -> StorageKey<$type> {
                    StorageKey::new(stringify!($name))
                }
            }

            #[uniffi::export]
            impl RustDatabase {
                pub fn [<get_ $name>](&self) -> FFIResult<Option<$type>> {
                    KEYS::$name().get(&self.conn()).uniffi()
                }

                pub fn [<set_ $name>](&self, value: Option<$type>) -> FFIResult<()> {
                    KEYS::$name().set(&self.conn(), value).uniffi()
                }
            }
        }
    };
}

storage_key!(dict_schema_ver, u16);
storage_key!(jmdict_etag, String);
storage_key!(jmnedict_etag, String);
storage_key!(saved_url, String);
storage_key!(android_current_view, String);

#[uniffi::export]
impl RustDatabase {
    /// Retrieves raw json storage value
    ///
    /// Should only be used from web
    pub fn get_raw_storage(&self, key: String) -> FFIResult<Option<String>> {
        get_raw_storage(&self.conn(), &key).uniffi()
    }

    /// Stores raw json storage value
    ///
    /// Should only be used from web
    pub fn set_raw_storage(&self, key: String, value: Option<String>) -> FFIResult<()> {
        set_raw_storage_optional(&self.conn(), &key, value).uniffi()
    }
}

pub fn set_raw_storage(db: &Connection, key: &str, value: &str) -> Result<()> {
    db.sql("INSERT OR REPLACE INTO storage(key, value) VALUES(?, ?)")?
        .execute(params![key, value])
        .context("Failed to insert value into DB storage")?;
    Ok(())
}

pub fn set_raw_storage_optional<T: Borrow<str>>(
    db: &Connection,
    key: &str,
    value: Option<T>,
) -> Result<()> {
    if let Some(value) = value {
        set_raw_storage(db, key, value.borrow())
    } else {
        remove_storage(db, key)?;
        Ok(())
    }
}

/// Save to DB after JSON stringifying the value.
pub fn set_storage<T: Serialize>(db: &Connection, key: &str, value: &T) -> Result<()> {
    let json_value = serde_json::to_string(value)?;
    set_raw_storage(db, key, &json_value)
}

/// Save to DB after JSON stringifying the value.
pub fn set_storage_optional<T, R>(db: &Connection, key: &str, value: Option<R>) -> Result<()>
where
    R: Borrow<T>,
    T: Serialize,
{
    let optional_json = value
        .map(|val| serde_json::to_string(val.borrow()))
        .transpose()?;
    set_raw_storage_optional(db, key, optional_json)
}

pub fn get_raw_storage(db: &Connection, key: &str) -> Result<Option<String>> {
    db.sql("SELECT value FROM storage WHERE key = ?")?
        .query_row([key], |row| row.get(0))
        .optional()
        .context("Failed to get value from DB storage")
}

/// Retrieve and deserialize a JSON value from storage.
pub fn get_storage<T: for<'de> Deserialize<'de>>(db: &Connection, key: &str) -> Result<Option<T>> {
    get_raw_storage(db, key)?
        .map(|val| {
            serde_json::from_str(&val).context("Failed to deserialize value to desired type")
        })
        .transpose()
}

/// Removes a storage entry by key.
///
/// Returns `true` if the key existed and was removed, `false` if the key didn't exist.
pub fn remove_storage(db: &Connection, key: &str) -> Result<bool> {
    let rows_affected = db
        .sql("DELETE FROM storage WHERE key = ?")?
        .execute([key])
        .context("Failed to remove value from DB storage")?;
    Ok(rows_affected > 0)
}
