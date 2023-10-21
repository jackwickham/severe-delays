mod config;
mod cors;
mod routes;
mod store;
mod tfl;
mod types;

use config::Config;
use cors::CorsFairing;
use rocket::fairing::AdHoc;
use store::StoreFairing;
use tfl::TflFairing;

#[macro_use]
extern crate rocket;

#[launch]
async fn rocket() -> _ {
    rocket::build()
        .attach(AdHoc::config::<Config>())
        .attach(StoreFairing::new())
        .attach(CorsFairing)
        .attach(TflFairing::new())
        .mount("/", routes::utils::get_routes())
        .mount("/", routes::fe::get_routes())
        .mount("/api", routes::api::get_routes())
}
