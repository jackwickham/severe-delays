use rocket::{
    fairing::{Fairing, Info, Kind},
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

    async fn on_ignite(&self, rocket: Rocket<rocket::Build>) -> rocket::fairing::Result {
        let store = Store::new().await;
        Ok(rocket.manage(store))
    }

    async fn on_shutdown(&self, rocket: &Rocket<rocket::Orbit>) {
        if let Some(store) = rocket.state::<Store>() {
            store.shutdown().await;
        }
    }
}
