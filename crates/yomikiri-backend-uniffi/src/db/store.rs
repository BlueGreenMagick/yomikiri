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
