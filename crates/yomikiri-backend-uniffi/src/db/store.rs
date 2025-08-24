use std::borrow::Borrow;
use std::collections::HashMap;
use std::marker::PhantomData;

use anyhow::{Context, Result};
use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};

use crate::error::{FFIResult, ToUniFFIResult};

use super::{ConnectionTrait, RustDatabase};

#[derive(Clone, Copy, Debug)]
pub struct StoreKey<T> {
    key: &'static str,
    _value: PhantomData<T>,
}

impl<T> StoreKey<T>
where
    T: Serialize + for<'de> Deserialize<'de>,
{
    fn new(key: &'static str) -> StoreKey<T> {
        StoreKey {
            key,
            _value: PhantomData,
        }
    }

    pub fn get(&self, db: &Connection) -> Result<Option<T>> {
        get_store(db, self.key)
    }

    pub fn set<R>(&self, db: &Connection, value: Option<R>) -> Result<()>
    where
        R: Borrow<T>,
        T: Serialize,
    {
        set_store_optional(db, self.key, value)
    }
}

macro_rules! store_key {
    ($name:ident, $type:ty) => {
        paste::paste! {
            impl StoreKey<$type> {
                pub fn $name() -> Self {
                    Self::new(stringify!($name))
                }
            }

            #[uniffi::export]
            impl RustDatabase {
                pub fn [<uniffi_get_ $name>](&self) -> FFIResult<Option<$type>> {
                    self.[<get_ $name>]().uniffi()
                }

                pub fn [<uniffi_set_ $name>](&self, value: Option<$type>) -> FFIResult<()> {
                    self.[<set_ $name>](value.as_ref()).uniffi()
                }
            }

            impl RustDatabase {
                pub fn [<get_ $name>](&self) -> Result<Option<$type>> {
                    StoreKey::$name().get(&self.conn())
                }

                pub fn [<set_ $name>](&self, value: Option<&$type>) -> Result<()> {
                    StoreKey::$name().set(&self.conn(), value)
                }
            }
        }
    };
}

store_key!(user_migration_version, u16);

store_key!(dict_schema_ver, u16);
store_key!(jmdict_etag, String);
store_key!(jmnedict_etag, String);
store_key!(saved_url, String);
store_key!(android_current_view, String);

// v2
store_key!(web_config_v4, String);
// v1
// holds config of version 0 ~ 3, before SQLite db based migration.
store_key!(web_config_v3, String);

#[uniffi::export]
impl RustDatabase {
    /// Retrieves raw json store value
    ///
    /// Should only be used from web
    pub fn uniffi_get_raw_store(&self, key: String) -> FFIResult<Option<String>> {
        self.get_raw_store(key).uniffi()
    }

    /// Retrieves multiple raw json store value
    ///
    /// keys: JSON serialized array of keys
    ///
    /// returns JSON serialized {[key: string]: string | null}
    /// where the string value is itself a JSON serialized value
    pub fn uniffi_get_raw_store_batch(&self, keys: String) -> FFIResult<String> {
        self.get_raw_store_batch(keys).uniffi()
    }

    /// Stores raw json store value
    ///
    /// Should only be used from web
    pub fn uniffi_set_raw_store(&self, key: String, value: Option<String>) -> FFIResult<()> {
        self.set_raw_store(key, value).uniffi()
    }

    /// Stores multiple raw json store values
    ///
    /// data: JSON serialized {[key: string]: string | null}
    /// If value is null, the key is deleted. Otherwise, the value is set.
    ///
    /// Should only be used from web
    pub fn uniffi_set_raw_store_batch(&self, data: String) -> FFIResult<()> {
        self.set_raw_store_batch(data).uniffi()
    }
}

impl RustDatabase {
    fn get_raw_store(&self, key: String) -> Result<Option<String>> {
        let mut conn = self.conn();
        let tx = conn.transaction()?;
        let result = get_raw_store(&tx, &key)?;
        tx.commit()?;
        Ok(result)
    }

    fn get_raw_store_batch(&self, keys: String) -> Result<String> {
        let keys_vec: Vec<String> =
            serde_json::from_str(&keys).context("Failed to deserialize keys as array of string")?;

        let mut conn = self.conn();
        let tx = conn.transaction()?;
        let mut result: HashMap<String, Option<String>> = HashMap::new();

        for key in keys_vec {
            let value = get_raw_store(&tx, &key)?;
            result.insert(key, value);
        }

        tx.commit()?;
        Ok(serde_json::to_string(&result)?)
    }

    fn set_raw_store(&self, key: String, value: Option<String>) -> Result<()> {
        let mut conn = self.conn();
        let tx = conn.transaction()?;
        set_raw_store_optional(&tx, &key, value)?;
        tx.commit()?;
        Ok(())
    }

    fn set_raw_store_batch(&self, data: String) -> Result<()> {
        let data_map: HashMap<String, Option<String>> = serde_json::from_str(&data).context(
            "Failed to deserialize data as object with string keys and optional string values",
        )?;
        let mut conn = self.conn();
        let tx = conn.transaction()?;
        for (key, value) in data_map {
            set_raw_store_optional(&tx, &key, value)?;
        }
        tx.commit()?;
        Ok(())
    }
}

pub fn set_raw_store(db: &Connection, key: &str, value: &str) -> Result<()> {
    db.sql("INSERT OR REPLACE INTO store(key, value) VALUES(?, ?)")?
        .execute(params![key, value])
        .context("Failed to insert value into DB store")?;
    Ok(())
}

pub fn set_raw_store_optional<T: Borrow<str>>(
    db: &Connection,
    key: &str,
    value: Option<T>,
) -> Result<()> {
    if let Some(value) = value {
        set_raw_store(db, key, value.borrow())
    } else {
        remove_store(db, key)?;
        Ok(())
    }
}

/// Save to DB after JSON stringifying the value.
pub fn set_store<T: Serialize>(db: &Connection, key: &str, value: &T) -> Result<()> {
    let json_value = serde_json::to_string(value)?;
    set_raw_store(db, key, &json_value)
}

/// Save to DB after JSON stringifying the value.
pub fn set_store_optional<T, R>(db: &Connection, key: &str, value: Option<R>) -> Result<()>
where
    R: Borrow<T>,
    T: Serialize,
{
    let optional_json = value
        .map(|val| serde_json::to_string(val.borrow()))
        .transpose()?;
    set_raw_store_optional(db, key, optional_json)
}

pub fn get_raw_store(db: &Connection, key: &str) -> Result<Option<String>> {
    db.sql("SELECT value FROM store WHERE key = ?")?
        .query_row([key], |row| row.get(0))
        .optional()
        .context("Failed to get value from DB store")
}

/// Retrieve and deserialize a JSON value from store.
pub fn get_store<T: for<'de> Deserialize<'de>>(db: &Connection, key: &str) -> Result<Option<T>> {
    get_raw_store(db, key)?
        .map(|val| {
            serde_json::from_str(&val).context("Failed to deserialize value to desired type")
        })
        .transpose()
}

/// Removes a store entry by key.
///
/// Returns `true` if the key existed and was removed, `false` if the key didn't exist.
pub fn remove_store(db: &Connection, key: &str) -> Result<bool> {
    let rows_affected = db
        .sql("DELETE FROM store WHERE key = ?")?
        .execute([key])
        .context("Failed to remove value from DB store")?;
    Ok(rows_affected > 0)
}
