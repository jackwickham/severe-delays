use std::{sync::RwLock, collections::HashMap};

use serde_json::Value;
use time::OffsetDateTime;

use super::{AbstractStore, LineHistoryEntry};

pub struct MemoryStore {
    history: RwLock<HashMap<String, Vec<LineHistoryEntry>>>,
}

impl MemoryStore {
    pub fn new() -> Self {
        MemoryStore {
            history: RwLock::new(HashMap::new()),
        }
    }
}

impl AbstractStore for MemoryStore {
    fn get_status_history<'a>(&'a self, start_time: OffsetDateTime, end_time: OffsetDateTime) -> HashMap<String, Vec<LineHistoryEntry>> {
        let history = self.history.read().unwrap();
        history.iter()
            .map(|(line, history)| {
                let history = history.iter()
                    .filter(|entry| entry.end_time.map_or(true, |t| t >= start_time) && entry.start_time <= end_time)
                     .map(|entry| (*entry).clone())
                    .collect::<Vec<_>>();
                (line.clone(), history)
            })
            .collect::<HashMap<_, _>>()
    }

    fn set_status(&self, status_by_line: HashMap<String, Value>) {
        let now = OffsetDateTime::now_utc();
        let mut history = self.history.write().unwrap();
        for (line, new_data) in status_by_line {
            let history = history.entry(line).or_insert_with(Vec::new);
            let last_entry = history.last_mut();
            if let Some(last_entry) = last_entry {
                if last_entry.data == new_data {
                    continue;
                }
                if last_entry.end_time.is_none() {
                    last_entry.end_time = Some(now);
                }
            }
            history.push(LineHistoryEntry {
                start_time: now,
                end_time: None,
                data: new_data,
            });
        }
    }
}
