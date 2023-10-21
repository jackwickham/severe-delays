use std::sync::Arc;

use rocket::fairing::{Fairing, Info, Kind};
use rocket::tokio::spawn;
use rocket::{Orbit, Rocket};

use crate::store::Store;

pub struct TflFairing {
    tfl: Arc<crate::tfl::Tfl>,
}

impl TflFairing {
    pub fn new(tfl: Arc<crate::tfl::Tfl>) -> Self {
        TflFairing { tfl }
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
        let tfl = self.tfl.clone();
        let store = rocket.state::<Store>().unwrap().clone();
        spawn(async move {
            tfl.as_ref().start_polling(store).await;
        });
    }
}
