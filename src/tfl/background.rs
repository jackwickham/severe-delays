use std::collections::{HashMap, HashSet};

use log::{info, warn};
use rocket::tokio;
use serde_json::Value;

use super::api::Api;
use crate::store::{AbstractStore, Store, UpdateChecker};

pub struct Tfl {
    api: Api,
}

const IGNORED_FIELDS: &[&str] = &["validityPeriods", "created"];

impl Tfl {
    pub fn new(api_key: Option<String>) -> Self {
        Tfl {
            api: Api::new(api_key),
        }
    }

    pub async fn start_polling(&self, store: &Store) {
        let mut interval = tokio::time::interval(std::time::Duration::from_secs(60));
        loop {
            interval.tick().await;
            let status = self.api.load_status().await;
            match status {
                Ok(status) => self.update_status(store, status).await,
                Err(err) => warn!("Error reloading TFL status: {:?}", err),
            }
        }
    }

    async fn update_status(&self, store: &Store, status: HashMap<String, Value>) {
        store.set_status(status, TflUpdateChecker()).await;
        info!("Updated status");
    }
}

struct TflUpdateChecker();

impl UpdateChecker for TflUpdateChecker {
    fn should_update(&self, old: &Value, new: &Value) -> bool {
        // Recursively compare the two values, ignoring fields named "validityPeriods" and "created"
        match (old, new) {
            (Value::Object(old), Value::Object(new)) => {
                let old_keys = old
                    .keys()
                    .filter(|k| !IGNORED_FIELDS.iter().any(|f| f == *k))
                    .collect::<HashSet<_>>();
                let new_keys = new
                    .keys()
                    .filter(|k| !IGNORED_FIELDS.iter().any(|f| f == *k))
                    .collect::<HashSet<_>>();
                if old_keys != new_keys {
                    return true;
                }
                old_keys
                    .into_iter()
                    .any(|k| self.should_update(old.get(k).unwrap(), new.get(k).unwrap()))
            }
            (Value::Array(old), Value::Array(new)) => {
                if old.len() != new.len() {
                    return true;
                }
                old.iter()
                    .zip(new.iter())
                    .any(|(old, new)| self.should_update(old, new))
            }
            (old, new) => old != new,
        }
    }
}
