mod config;
mod cors;
mod store;
mod tfl;
mod types;

use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::Arc;

use config::Config;
use cors::CorsFairing;
use rocket::fairing::AdHoc;
use rocket::fs::NamedFile;
use rocket::http::Header;
use rocket::response::Responder;
use rocket::serde::json::Json;
use rocket::{form::FromFormField, http::Status, State};
use serde::Serialize;
use store::{AbstractStore, Store, StoreFairing};
use tfl::{Tfl, TflFairing};
use time::{format_description, OffsetDateTime};

#[macro_use]
extern crate rocket;

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
        serializer.serialize_str(
            &self
                .0
                .format(&format_description::well_known::Rfc3339)
                .unwrap(),
        )
    }
}

impl<'a> FromFormField<'a> for SerializableDateTime {
    fn from_value(field: rocket::form::ValueField<'a>) -> rocket::form::Result<'a, Self> {
        let dt = OffsetDateTime::parse(&field.value, &format_description::well_known::Rfc3339)
            .map_err(|_| rocket::form::Error::validation("Invalid date"))?;
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

struct AdditionalHeadersResponse<'a, R> {
    inner: R,
    headers: Vec<Header<'a>>,
}

impl<R> AdditionalHeadersResponse<'static, R> {
    fn new(inner: R) -> Self {
        Self {
            inner,
            headers: Vec::new(),
        }
    }
}

impl<'a, R> AdditionalHeadersResponse<'a, R> {
    fn with_header(mut self, header: Header<'a>) -> AdditionalHeadersResponse<'a, R> {
        self.headers.push(header);
        self
    }

    fn immutable(mut self) -> Self {
        self.headers.push(Header::new(
            "Cache-Control",
            "max-age=31536000, public, immutable",
        ));
        self
    }
}

impl<'r, 'o: 'r, R: Responder<'r, 'o>> Responder<'r, 'o> for AdditionalHeadersResponse<'o, R> {
    fn respond_to(self, request: &'r rocket::Request<'_>) -> rocket::response::Result<'o> {
        let mut response = self.inner.respond_to(request)?;
        for header in self.headers {
            response.set_header(header);
        }
        Ok(response)
    }
}

#[get("/api/v1/history?<from>&<to>")]
async fn history(
    store: &State<Arc<Store>>,
    from: SerializableDateTime,
    to: SerializableDateTime,
) -> Json<HashMap<String, Vec<ApiLineStatusEntry>>> {
    let status_history = store.get_status_history(from.into(), to.into()).await;
    let response = status_history
        .into_iter()
        .map(|(line, entries)| {
            let entries = entries
                .into_iter()
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

#[get("/api/<_..>")]
async fn api_not_found() -> Status {
    Status::NotFound
}

#[get("/<path..>")]
async fn static_file(path: PathBuf) -> Option<AdditionalHeadersResponse<'static, NamedFile>> {
    let immutable = path.starts_with("assets/");
    let mut resolved_path = Path::new("fe/dist").join(path).to_path_buf();
    if resolved_path.is_dir() {
        resolved_path.push("index.html");
    }

    let response = AdditionalHeadersResponse::new(NamedFile::open(resolved_path).await.ok()?);
    if immutable {
        Some(response.immutable())
    } else {
        Some(response)
    }
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
        .attach(AdHoc::config::<Config>())
        .manage(tfl.clone())
        .attach(StoreFairing::new())
        .attach(CorsFairing)
        .attach(TflFairing::new(tfl))
        .mount("/", routes![history, api_not_found, static_file, options])
}
