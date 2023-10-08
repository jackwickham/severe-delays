mod store;
mod tfl;
mod types;
mod cors;

use std::collections::HashMap;
use std::sync::Arc;

use cors::CorsFairing;
use serde::Serialize;
use store::{Store, AbstractStore, StoreFairing};
use tfl::{Tfl, TflFairing};
use rocket::{State, form::FromFormField};
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

impl <'a> FromFormField<'a> for SerializableDateTime {
    fn from_value(field: rocket::form::ValueField<'a>) -> rocket::form::Result<'a, Self> {
        let dt = OffsetDateTime::parse(&field.value, &format_description::well_known::Rfc3339).map_err(|_| rocket::form::Error::validation("Invalid date"))?;
        Ok(SerializableDateTime(dt))
    }
}

impl From<OffsetDateTime> for SerializableDateTime {
    fn from(dt: OffsetDateTime) -> Self {
        SerializableDateTime(dt)
    }
}

impl Into<OffsetDateTime> for SerializableDateTime {
    fn into(self) -> OffsetDateTime {
        self.0
    }
}

#[get("/api/v1/history?<from>&<to>")]
async fn history(store: &State<Arc<Store>>, from: SerializableDateTime, to: SerializableDateTime) -> Json<HashMap<String, Vec<ApiLineStatusEntry>>> {
    let status_history = store.get_status_history(from.into(), to.into()).await;
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
                .fold(Vec::<ApiLineStatusEntry>::new(), |mut acc, entry| {
                    if let Some(last_entry) = acc.last_mut() {
                        if last_entry.status == entry.status && last_entry.reason == entry.reason {
                            last_entry.to = entry.to;
                            return acc;
                        }
                    }
                    acc.push(entry);
                    acc
                });
            (line, entries)
        })
        .collect::<HashMap<_, _>>();
    Json(response)
}

/// Handle OPTION requests to send CORS headers
#[options("/<_..>")]
fn options() {
    // Intentionally empty
}

#[launch]
async fn rocket() -> _ {
    let tfl = Arc::new(Tfl::new(None));
    rocket::build()
        .manage(tfl.clone())
        .attach(StoreFairing::new())
        .attach(CorsFairing)
        .attach(TflFairing::new(tfl))
        .mount("/", routes![history, options])
}
