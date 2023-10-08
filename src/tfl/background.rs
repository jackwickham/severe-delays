use std::collections::HashMap;

use log::{info, warn};
use rocket::tokio;
use serde_json::Value;

use crate::store::{AbstractStore, Store};
use super::api::Api;


pub struct Tfl {
    api: Api,
}

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
        store.set_status(status).await;
        info!("Updated status");
    }
}