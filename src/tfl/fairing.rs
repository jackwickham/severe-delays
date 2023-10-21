use rocket::fairing::{Fairing, Info, Kind};
use rocket::tokio::spawn;
use rocket::{Orbit, Rocket};

use crate::store::Store;

use super::Tfl;

pub struct TflFairing();

impl TflFairing {
    pub fn new() -> Self {
        TflFairing()
    }
}

#[rocket::async_trait]
impl Fairing for TflFairing {
    fn info(&self) -> Info {
        Info {
            name: "TFL Background Task",
            kind: Kind::Liftoff,
        }
    }

    async fn on_liftoff(&self, rocket: &Rocket<Orbit>) {
        let config = rocket.state::<crate::config::Config>().unwrap();
        let tfl = Tfl::new(config.tfl_api_key.clone());
        let store = rocket.state::<Store>().unwrap().clone();
        spawn(async move {
            tfl.start_polling(store).await;
        });
    }
}
