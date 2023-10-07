mod store;
mod tfl;
mod types;
mod cors;

use std::collections::HashMap;
use std::sync::Arc;

use cors::CorsFairing;
use serde::Serialize;
use store::{Store, AbstractStore};
use tfl::{Tfl, TflFairing};
use rocket::State;
use rocket::serde::json::Json;
use time::{OffsetDateTime, format_description};

#[macro_use] extern crate rocket;

#[derive(Debug, Clone, Serialize)]
struct ApiLineStatusEntry {
    status: types::Status,
    reason: Option<String>,
    from: SerializableDateTime,
    to: Option<SerializableDateTime>,
}

#[derive(Debug, Clone)]
struct SerializableDateTime(OffsetDateTime);

impl Serialize for SerializableDateTime {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
        {
            serializer.serialize_str(&self.0.format(&format_description::well_known::Rfc3339).unwrap())
        }
}

impl From<OffsetDateTime> for SerializableDateTime {
    fn from(dt: OffsetDateTime) -> Self {
        SerializableDateTime(dt)
    }
}

#[get("/<_..>")]
async fn index(store: &State<Arc<Store>>) -> String {
    let status_history = store.get_status_history(OffsetDateTime::now_utc() - time::Duration::days(1), OffsetDateTime::now_utc());
    status_history.into_iter()
        .map(|(line_id, history)| line_id)
        .collect::<Vec<String>>()
        .join("\n\n")
}

#[get("/api")]
async fn api(store: &State<Arc<Store>>) -> Json<HashMap<String, Vec<ApiLineStatusEntry>>> {
    let status_history = store.get_status_history(OffsetDateTime::now_utc() - time::Duration::days(1), OffsetDateTime::now_utc());
    let response = status_history.into_iter()
        .map(|(line, entries)| {
            let entries = entries.into_iter()
                .filter_map(|entry| {
                    let parsed_entry = tfl::try_parse(&line, &entry.data)?;
                    Some(ApiLineStatusEntry {
                        status: parsed_entry.status,
                        reason: parsed_entry.reason,
                        from: entry.start_time.into(),
                        to: entry.end_time.map(SerializableDateTime::from),
                    })
                })
                .collect::<Vec<_>>();
            (line, entries)
        })
        .collect::<HashMap<_, _>>();
    Json(response)
}

/// Handle OPTION requests to send CORS headers
#[options("/<_..>")]
fn all_options() {
    // Intentionally empty
}

#[launch]
fn rocket() -> _ {
    let store = Arc::new(store::create_store());
    let tfl = Arc::new(Tfl::new(None));
    rocket::build()
        .manage(store)
        .manage(tfl.clone())
        .attach(CorsFairing)
        .attach(TflFairing::new(tfl))
        .mount("/", routes![index, api])
}
