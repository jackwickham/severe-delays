use std::collections::HashMap;

use rocket::form::FromFormField;
use rocket::{serde::json::Json, Route};
use serde::Serialize;
use time::{format_description, OffsetDateTime};

use crate::store::StoreConnection;
use crate::types::LineMetadata;
use crate::{tfl, types::Status};

pub fn get_routes() -> Vec<Route> {
    routes![history]
}

#[derive(Debug, Clone, Serialize)]
struct ApiLineHistory {
    history: Vec<ApiLineStatus>,
    metadata: ApiLineMetadata,
}

#[derive(Debug, Clone, Serialize)]
struct ApiLineStatus {
    entries: Vec<ApiLineStatusEntry>,
    from: SerializableDateTime,
    to: Option<SerializableDateTime>,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
struct ApiLineStatusEntry {
    status: Status,
    reason: Option<String>,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
struct ApiLineMetadata {
    mode: Option<String>,
}

impl From<Option<LineMetadata>> for ApiLineMetadata {
    fn from(value: Option<LineMetadata>) -> Self {
        ApiLineMetadata {
            mode: value.map(|m| m.mode),
        }
    }
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

#[get("/v1/history?<from>&<to>")]
async fn history(
    mut store: StoreConnection,
    from: SerializableDateTime,
    to: SerializableDateTime,
) -> Result<Json<HashMap<String, ApiLineHistory>>, rocket::http::Status> {
    let status_history = store
        .get_line_status_history(from.into(), to.into())
        .await
        .map_err(|e| {
            error!("Error getting status history: {:?}", e);
            rocket::http::Status::InternalServerError
        })?;
    let response = status_history
        .into_iter()
        .map(|(line, entries)| {
            let (history, metadata) = entries
                .into_iter()
                .filter_map(|entry| {
                    let (metadata, parsed_entries) = tfl::try_parse(&line, &entry.data)?;
                    Some((
                        ApiLineStatus {
                            entries: parsed_entries
                                .into_iter()
                                .map(|e| ApiLineStatusEntry {
                                    status: e.status,
                                    reason: e.reason,
                                })
                                .collect::<Vec<_>>(),
                            from: entry.start_time.into(),
                            to: entry.end_time.map(SerializableDateTime::from),
                        },
                        metadata,
                    ))
                })
                .fold(
                    (Vec::<ApiLineStatus>::new(), None),
                    |(mut acc, _), (status, metadata)| {
                        if let Some(last_status) = acc.last_mut() {
                            if last_status.entries == status.entries {
                                last_status.to = status.to;
                                return (acc, Some(metadata));
                            }
                        }
                        acc.push(status);
                        (acc, Some(metadata))
                    },
                );
            (
                line,
                ApiLineHistory {
                    history,
                    metadata: metadata.into(),
                },
            )
        })
        .collect::<HashMap<_, _>>();
    Ok(Json(response))
}
