use std::collections::HashSet;

use log::{debug, warn};
use rocket::tokio::{self, try_join};
use serde_json::Value;

use super::api::{Api, ApiError};
use crate::store::{ConnectionError, SetStatusError, Store};

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

    pub async fn start_polling(&self, mut store: Store) {
        let mut interval = tokio::time::interval(std::time::Duration::from_secs(60));
        loop {
            interval.tick().await;
            match self.update_status(&mut store).await {
                Ok(()) => debug!("Updated TFL status"),
                Err(PollError::ApiError(err)) => warn!("Error reloading TFL status: {:?}", err),
                Err(PollError::ConnectionError(err)) => {
                    warn!(
                        "Failed to acquire DB connection while reloading TFL status: {:?}",
                        err
                    )
                }
                Err(PollError::SetStatusError(err)) => {
                    warn!("Failed to set TFL status in DB: {:?}", err)
                }
            }
        }
    }

    async fn update_status(&self, store: &mut Store) -> Result<(), PollError> {
        let line_status_future = self.api.load_line_status();
        let station_status_future = self.api.load_station_status();
        let (line_status, station_status) = try_join!(line_status_future, station_status_future)?;

        let mut connection = store.get_connection().await?;
        connection
            .set_line_status(line_status, should_update_line)
            .await?;
        connection
            .set_station_status(station_status, should_update_station)
            .await?;

        Ok(())
    }
}

fn should_update_line(old: &Value, new: &Value) -> bool {
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
                .any(|k| should_update_line(old.get(k).unwrap(), new.get(k).unwrap()))
        }
        (Value::Array(old), Value::Array(new)) => {
            if old.len() != new.len() {
                return true;
            }
            old.iter()
                .zip(new.iter())
                .any(|(old, new)| should_update_line(old, new))
        }
        (old, new) => old != new,
    }
}

fn should_update_station(old: &Vec<Value>, new: &Vec<Value>) -> bool {
    if old.len() != new.len() {
        return true;
    }
    // Assumes the entries are returned in a consistent order
    old.iter().zip(new.iter()).any(|(old, new)| {
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
                    .any(|k| should_update_line(old.get(k).unwrap(), new.get(k).unwrap()))
            }
            (Value::Array(old), Value::Array(new)) => {
                if old.len() != new.len() {
                    return true;
                }
                old.iter()
                    .zip(new.iter())
                    .any(|(old, new)| should_update_line(old, new))
            }
            (old, new) => old != new,
        }
    })
}

#[derive(Debug)]
enum PollError {
    ApiError(ApiError),
    ConnectionError(ConnectionError),
    SetStatusError(SetStatusError),
}

impl From<ApiError> for PollError {
    fn from(err: ApiError) -> Self {
        PollError::ApiError(err)
    }
}

impl From<ConnectionError> for PollError {
    fn from(err: ConnectionError) -> Self {
        PollError::ConnectionError(err)
    }
}

impl From<SetStatusError> for PollError {
    fn from(err: SetStatusError) -> Self {
        PollError::SetStatusError(err)
    }
}
