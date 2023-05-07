mod tfl;
mod types;

use std::sync::Arc;

use tfl::{Tfl, TflFairing};
use rocket::State;

#[macro_use] extern crate rocket;

#[get("/<_..>")]
async fn index(tfl: &State<Arc<Tfl>>) -> String {
    let line_statuses = tfl.get_status();
    let mut formatted_statuses = line_statuses.into_iter()
        .map(|(line, status)| (
            line,
            format!("{:?}{}", status.status, status.reason.map(|reason| format!(" ({})", reason.trim())).unwrap_or(String::new()))))
        .map(|(line, statuses)| format!("{}: {}", line, statuses))
        .collect::<Vec<_>>();
    formatted_statuses.sort_unstable();
    formatted_statuses.join("\n")
}

#[launch]
fn rocket() -> _ {
    let tfl = Arc::new(Tfl::new(None));
    rocket::build()
        .attach(TflFairing::new(tfl.clone()))
        .manage(tfl)
        .mount("/", routes![index])
}
