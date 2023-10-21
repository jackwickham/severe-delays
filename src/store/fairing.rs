use rocket::{
    fairing::{Fairing, Info, Kind, Result},
    Rocket,
};

use super::Store;

pub struct StoreFairing;

impl StoreFairing {
    pub fn new() -> Self {
        StoreFairing
    }
}

#[rocket::async_trait]
impl Fairing for StoreFairing {
    fn info(&self) -> Info {
        Info {
            name: "Store",
            kind: Kind::Ignite | Kind::Shutdown,
        }
    }

    async fn on_ignite(&self, rocket: Rocket<rocket::Build>) -> Result {
        match Store::new().await {
            Ok(store) => Ok(rocket.manage(store)),
            Err(e) => {
                log::error!("Failed to initialize store: {:?}", e);
                Err(rocket)
            }
        }
    }

    async fn on_shutdown(&self, rocket: &Rocket<rocket::Orbit>) {
        if let Some(store) = rocket.state::<Store>() {
            store.shutdown().await;
        }
    }
}
