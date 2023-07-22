mod memory;

use std::collections::HashMap;

use time::OffsetDateTime;

use crate::types::LineStatus;
use self::memory::MemoryStore;

pub type Store = MemoryStore;
pub type State = HashMap<String, LineStatus>;

pub trait AbstractStore {
    type HistoryIterator<'a>: Iterator<Item = HistoryEntry> where Self : 'a;

    fn get_current_status(&self) -> State;
    fn get_status_history<'a>(&'a self) -> Self::HistoryIterator<'a>;
    fn set_status(&self, status: State);
}

pub fn create_store() -> Store {
    MemoryStore::new()
}

#[derive(Debug, Clone)]
pub struct HistoryEntry {
    pub start_time: OffsetDateTime,
    pub status: State,
}
