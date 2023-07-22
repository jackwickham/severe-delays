use std::collections::HashMap;

use log::{info, warn};
use rocket::tokio;

use crate::{types::LineStatus, store::{AbstractStore, Store}};
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
                Ok(status) => self.update_status(store, status),
                Err(err) => warn!("Error reloading TFL status: {:?}", err),
            }
        }
    }

    fn update_status(&self, store: &Store, status: HashMap<String, LineStatus>) {
        store.set_status(status);
        info!("Updated status");
    }
}