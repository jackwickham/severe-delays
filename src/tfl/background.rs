use std::{sync::Mutex, collections::HashMap};

use log::{info, warn};
use rocket::tokio;

use crate::types::LineStatus;
use super::api::Api;


pub struct Tfl {
    status: Mutex<HashMap<String, LineStatus>>,
    api: Api,
}

impl Tfl {
    pub fn new(api_key: Option<String>) -> Self {
        Tfl {
            status: Mutex::new(HashMap::new()),
            api: Api::new(api_key),
        }
    }

    pub async fn start_polling(&self) {
        let mut interval = tokio::time::interval(std::time::Duration::from_secs(60));
        loop {
            interval.tick().await;
            let status = self.api.load_status().await;
            match status {
                Ok(status) => self.update_status(status),
                Err(err) => warn!("Error reloading TFL status: {:?}", err),
            }
        }
    }

    pub fn get_status(&self) -> HashMap<String, LineStatus> {
        (*self.status.lock().unwrap()).clone()
    }

    fn update_status(&self, status: HashMap<String, LineStatus>) {
        *self.status.lock().unwrap() = status;
        info!("Updated status");
    }
}