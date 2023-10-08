use std::sync::Arc;

use rocket::{fairing::{Fairing, Kind, Info}, Rocket};

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

    async fn on_ignite(&self, rocket: Rocket<rocket::Build>) -> rocket::fairing::Result {
        let store = Store::new().await;
        Ok(rocket.manage(Arc::new(store)))
    }

    async fn on_shutdown(&self, rocket: &Rocket<rocket::Orbit>) {
        if let Some(store) = rocket.state::<Arc<Store>>() {
            store.shutdown().await;
        }
    }
}
