use super::{api::Api, parser::StopPointDetails};
use rocket::tokio::sync::RwLock;
use std::sync::Arc;
use std::time::Instant;

#[derive(Debug)]
enum LoadState {
    /// Not loaded yet
    NotLoaded,
    /// Currently loading (with timestamp of when loading started)
    Loading(Instant),
    /// Successfully loaded
    Loaded(Vec<StopPointDetails>),
    /// Failed to load (with error message)
    Failed(String),
}

/// Manages asynchronous loading of station details
pub struct LoadedStationDetails {
    state: Arc<RwLock<LoadState>>,
    api: Arc<Api>,
}

impl LoadedStationDetails {
    pub fn new(api: Arc<Api>) -> Self {
        LoadedStationDetails {
            state: Arc::new(RwLock::new(LoadState::NotLoaded)),
            api,
        }
    }

    /// Gets or loads the station details with future
    pub async fn get_details(&self) -> Result<Vec<StopPointDetails>, String> {
        // Check current state - use Box::pin to handle the recursive async fn
        let state = self.state.read().await;
        match &*state {
            LoadState::Loaded(details) => {
                // If we already have details, return them immediately
                return Ok(details.clone());
            }
            LoadState::Loading(_) => {
                // If a load is in progress, tell the user to try again later
                return Err(
                    "Station details are currently loading, please try again later".to_string(),
                );
            }
            LoadState::Failed(_) => {
                // If previous loading failed, try to load again
                drop(state); // Release read lock

                // Initiate a load
                let mut state = self.state.write().await;
                *state = LoadState::Loading(Instant::now());
                drop(state);

                self.perform_load().await // Start a new load attempt
            }
            LoadState::NotLoaded => {
                // Not loaded yet, initiate a load
                drop(state); // Release read lock

                // Initiate a load
                let mut state = self.state.write().await;
                *state = LoadState::Loading(Instant::now());
                drop(state);

                self.perform_load().await // Start a new load attempt
            }
        }
    }

    /// Helper method to perform the actual load operation
    async fn perform_load(&self) -> Result<Vec<StopPointDetails>, String> {
        match self.api.load_station_details().await {
            Ok(details) => {
                // Store the details
                log::info!("Successfully loaded {} station details", details.len());
                let details_clone = details.clone();
                *self.state.write().await = LoadState::Loaded(details);
                Ok(details_clone)
            }
            Err(e) => {
                // Record the failure
                let error_msg = format!("Failed to load station details: {:?}", e);
                log::error!("{}", error_msg);
                *self.state.write().await = LoadState::Failed(error_msg.clone());
                Err(error_msg)
            }
        }
    }
}
