mod config;
mod cors;
mod routes;
mod store;
mod tfl;
mod types;

use std::sync::Arc;

use config::Config;
use cors::CorsFairing;
use rocket::fairing::AdHoc;
use store::StoreFairing;
use tfl::{Tfl, TflFairing};

#[macro_use]
extern crate rocket;

#[launch]
async fn rocket() -> _ {
    let tfl = Arc::new(Tfl::new(None));
    rocket::build()
        .attach(AdHoc::config::<Config>())
        .manage(tfl.clone())
        .attach(StoreFairing::new())
        .attach(CorsFairing)
        .attach(TflFairing::new(tfl))
        .mount("/", routes::utils::get_routes())
        .mount("/", routes::fe::get_routes())
        .mount("/api", routes::api::get_routes())
}
