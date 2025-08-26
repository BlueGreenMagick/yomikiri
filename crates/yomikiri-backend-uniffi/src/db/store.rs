use std::borrow::Borrow;
use std::marker::PhantomData;

use anyhow::{Context, Result};
use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};

use crate::error::{FFIResult, ToUniFFIResult};

use super::{ConnectionTrait, RustDatabase};

/// Key for storing raw string values (no JSON serialization)
#[derive(Clone, Copy, Debug)]
pub struct JsonStoreKey {
    key: &'static str,
}

impl JsonStoreKey {
    /// Get raw string value from store
    pub fn get(&self, db: &Connection) -> Result<Option<String>> {
        get_raw_store(db, self.key)
    }

    /// Set raw string value in store
    pub fn set<S: AsRef<str>>(&self, db: &Connection, value: Option<S>) -> Result<()> {
        set_raw_store_optional(db, self.key, value)
    }
}

/// Key for storing typed values (with JSON serialization)
#[derive(Clone, Copy, Debug)]
pub struct StoreKey<T> {
    inner: JsonStoreKey,
    _value: PhantomData<T>,
}

impl<T> StoreKey<T>
where
    T: Serialize + for<'de> Deserialize<'de>,
{
    fn new(key: &'static str) -> StoreKey<T> {
        StoreKey {
            inner: JsonStoreKey { key },
            _value: PhantomData,
        }
    }

    /// Get and deserialize value from store
    pub fn get(&self, db: &Connection) -> Result<Option<T>> {
        self.inner
            .get(db)?
            .map(|val| {
                serde_json::from_str(&val).context("Failed to deserialize value to desired type")
            })
            .transpose()
    }

    /// Serialize and set value in store
    pub fn set<R>(&self, db: &Connection, value: Option<R>) -> Result<()>
    where
        R: Borrow<T>,
        T: Serialize,
    {
        let optional_json = value
            .map(|val| serde_json::to_string(val.borrow()))
            .transpose()?;
        self.inner.set(db, optional_json.as_deref())
    }
}

macro_rules! impl_db_methods {
    ($name:ident, $key_type:ty, $value_type:ty) => {
        paste::paste! {
            #[uniffi::export]
            impl RustDatabase {
                pub fn [<uniffi_get_ $name>](&self) -> FFIResult<Option<$value_type>> {
                    <$key_type>::$name().get(&self.conn()).uniffi()
                }

                pub fn [<uniffi_set_ $name>](&self, value: Option<$value_type>) -> FFIResult<()> {
                    <$key_type>::$name().set(&self.conn(), value.as_ref()).uniffi()
                }
            }
        }
    };
}

macro_rules! store_key {
    ($name:ident, $type:ty) => {
        impl StoreKey<$type> {
            pub fn $name() -> Self {
                Self::new(stringify!($name))
            }
        }

        impl_db_methods!($name, StoreKey<$type>, $type);
    };
}

macro_rules! json_store_key {
    ($name:ident) => {
        impl JsonStoreKey {
            pub fn $name() -> Self {
                Self {
                    key: stringify!($name),
                }
            }
        }

        impl_db_methods!($name, JsonStoreKey, String);
    };
}

fn set_raw_store<T: AsRef<str>>(db: &Connection, key: &str, value: T) -> Result<()> {
    db.sql("INSERT OR REPLACE INTO store(key, value) VALUES(?, ?)")?
        .execute(params![key, value.as_ref()])
        .context("Failed to insert value into DB store")?;
    Ok(())
}

fn set_raw_store_optional<T: AsRef<str>>(
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

fn get_raw_store(db: &Connection, key: &str) -> Result<Option<String>> {
    db.sql("SELECT value FROM store WHERE key = ?")?
        .query_row([key], |row| row.get(0))
        .optional()
        .context("Failed to get value from DB store")
}

/// Removes a store entry by key.
///
/// Returns `true` if the key existed and was removed, `false` if the key didn't exist.
fn remove_store(db: &Connection, key: &str) -> Result<bool> {
    let rows_affected = db
        .sql("DELETE FROM store WHERE key = ?")?
        .execute([key])
        .context("Failed to remove value from DB store")?;
    Ok(rows_affected > 0)
}

// v1..
// Stores the version used for user migration
store_key!(user_migration_version, u16);

// v1..
store_key!(dict_schema_ver, u16);
// v1..
store_key!(jmdict_etag, String);
// v1..
store_key!(jmnedict_etag, String);
// v1..
// last open url of Internet tab
store_key!(saved_url, String);
// v1..
// last used android view
store_key!(android_current_view, String);

// v2..
json_store_key!(web_config_v4);
// v1..=v1
// holds config of version 0 ~ 3, before SQLite db based migration.
json_store_key!(web_config_v3);
