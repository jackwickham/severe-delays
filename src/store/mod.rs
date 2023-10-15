mod fairing;
mod memory;
mod sqlite;

use std::collections::HashMap;

use async_trait::async_trait;
use serde::Serialize;
use serde_json::Value;
use time::OffsetDateTime;

use self::{memory::MemoryStore, sqlite::SqliteStore};

pub use self::fairing::StoreFairing;

pub type Store = SqliteStore;

#[derive(Debug, Clone, Serialize)]
pub struct LineHistoryEntry {
    pub start_time: OffsetDateTime,
    pub end_time: Option<OffsetDateTime>,
    pub data: Value,
}

#[async_trait]
pub trait AbstractStore {
    async fn get_status_history<'a>(
        &'a self,
        start_time: OffsetDateTime,
        end_time: OffsetDateTime,
    ) -> HashMap<String, Vec<LineHistoryEntry>>;

    async fn set_status<U: UpdateChecker>(
        &self,
        status_by_line: HashMap<String, Value>,
        should_update: U,
    );
}

pub trait UpdateChecker: Send + Sync {
    fn should_update(&self, old: &Value, new: &Value) -> bool;
}

pub async fn create_store() -> Store {
    SqliteStore::new().await
}
