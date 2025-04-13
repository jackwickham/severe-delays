use rocket::fairing::{Fairing, Info, Kind};
use rocket::tokio::spawn;
use rocket::{Build, Orbit, Rocket};
use std::sync::Arc;

use crate::store::Store;

use super::{LoadedStationDetails, Tfl};

pub struct TflFairing;

impl TflFairing {
    pub fn new() -> Self {
        TflFairing
    }
}

#[rocket::async_trait]
impl Fairing for TflFairing {
    fn info(&self) -> Info {
        Info {
            name: "TFL Background Task",
            kind: Kind::Ignite | Kind::Liftoff,
        }
    }

    async fn on_ignite(&self, mut rocket: Rocket<Build>) -> Result<Rocket<Build>, Rocket<Build>> {
        let config = rocket.state::<crate::config::Config>().unwrap();
        
        // Create the Tfl instance that will be shared
        let tfl = Arc::new(Tfl::new(config.tfl_api_key.clone()));
        
        // Create station details handler (loads asynchronously) 
        let api_ref = Arc::new(tfl.api.clone());
        let station_details = Arc::new(LoadedStationDetails::new(api_ref));
        
        // Add both to rocket state
        rocket = rocket.manage(station_details);
        Ok(rocket.manage(tfl))
    }

    async fn on_liftoff(&self, rocket: &Rocket<Orbit>) {
        // Here we use the already created Tfl instance
        let tfl = rocket.state::<Arc<Tfl>>().unwrap().clone();
        let store = rocket.state::<Store>().unwrap().clone();
        
        // Start polling for updates
        spawn(async move {
            tfl.start_polling(store).await;
        });
        
        // Also kick off station details loading
        if let Some(station_details) = rocket.state::<Arc<LoadedStationDetails>>() {
            // Clone the Arc to avoid lifetime issues
            let details = station_details.clone();
            
            // Spawn a task to load station details in the background
            spawn(async move {
                let _ = details.get_details().await;
            });
        }
    }
}
