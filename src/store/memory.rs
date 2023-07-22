use std::{sync::RwLock, collections::HashMap};

use time::OffsetDateTime;

use super::{HistoryEntry, AbstractStore, State};

pub struct MemoryStore {
    history: RwLock<Vec<HistoryEntry>>,
}

impl MemoryStore {
    pub fn new() -> Self {
        MemoryStore {
            history: RwLock::new(Vec::new()),
        }
    }
}

impl AbstractStore for MemoryStore {
    type HistoryIterator<'a> = MemoryHistoryIterator<'a>;

    fn get_current_status(&self) -> State {
        self.history.read().unwrap().last().map(|entry| entry.status.clone()).unwrap_or(HashMap::new())
    }

    fn get_status_history<'a>(&'a self) -> Self::HistoryIterator<'a> {
        MemoryHistoryIterator::new(self)
    }

    fn set_status(&self, status: State) {
        let mut history = self.history.write().unwrap();
        if history.len() == 0 || history.last().unwrap().status != status {
            info!("Status has changed!");
            history.push(HistoryEntry {
                start_time: OffsetDateTime::now_utc(),
                status,
            });
        }
    }
}

pub struct MemoryHistoryIterator<'a> {
    store: &'a MemoryStore,
    index: usize,
}

impl<'a> MemoryHistoryIterator<'a> {
    pub fn new(store: &'a MemoryStore) -> Self {
        MemoryHistoryIterator {
            store,
            index: store.history.read().unwrap().len(),
        }
    }
}

impl<'a> Iterator for MemoryHistoryIterator<'a> {
    type Item = HistoryEntry;

    fn next(&mut self) -> Option<Self::Item> {
        let history = self.store.history.read().unwrap();
        if self.index > 0 {
            self.index -= 1;
            let item = history[self.index].clone();
            Some(item)
        } else {
            None
        }
    }
}
