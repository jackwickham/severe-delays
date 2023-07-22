mod store;
mod tfl;
mod types;

use std::sync::Arc;

use store::{Store, AbstractStore, HistoryEntry};
use tfl::{Tfl, TflFairing};
use rocket::State;
use time::macros::format_description;

#[macro_use] extern crate rocket;

#[get("/<_..>")]
async fn index(store: &State<Arc<Store>>) -> String {
    let status_history = store.get_status_history();
    status_history.into_iter()
        .map(|entry| format_state(entry))
        .collect::<Vec<String>>()
        .join("\n\n")
}

fn format_state(entry: HistoryEntry) -> String {
    let mut formatted_statuses = entry.status.into_iter()
        .map(|(line, status)| (
            line,
            format!("{:?}{}", status.status, status.reason.map(|reason| format!(" ({})", reason.trim())).unwrap_or(String::new()))))
        .map(|(line, statuses)| format!("{}: {}", line, statuses))
        .collect::<Vec<_>>();
    formatted_statuses.sort_unstable();

    format!("{}\n{}", entry.start_time.format(format_description!("[year]-[month]-[day] [hour]:[minute]:[second]")).unwrap(), formatted_statuses.join("\n"))
}

#[launch]
fn rocket() -> _ {
    let store = Arc::new(store::create_store());
    let tfl = Arc::new(Tfl::new(None));
    rocket::build()
        .manage(store)
        .manage(tfl.clone())
        .attach(TflFairing::new(tfl))
        .mount("/", routes![index])
}
