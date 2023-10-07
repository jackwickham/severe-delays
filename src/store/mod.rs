mod memory;

use std::collections::HashMap;

use serde::Serialize;
use serde_json::Value;
use time::OffsetDateTime;

use self::memory::MemoryStore;

pub type Store = MemoryStore;

#[derive(Debug, Clone, Serialize)]
pub struct LineHistoryEntry {
    pub start_time: OffsetDateTime,
    pub end_time: Option<OffsetDateTime>,
    pub data: Value,
}

pub trait AbstractStore {
    fn get_status_history<'a>(&'a self, start_time: OffsetDateTime, end_time: OffsetDateTime) -> HashMap<String, Vec<LineHistoryEntry>>;
    fn set_status(&self, status_by_line: HashMap<String, Value>);
}

pub fn create_store() -> Store {
    MemoryStore::new()
}
