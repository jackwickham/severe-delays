use std::collections::HashMap;
use std::sync::Arc;

use log::warn;
use rocket::form::FromFormField;
use rocket::State;
use rocket::{serde::json::Json, Route};
use serde::Serialize;
use time::ext::NumericalDuration;
use time::{format_description, OffsetDateTime};

use crate::store::StoreConnection;
use crate::tfl::LoadedStationDetails;
use crate::types::{LineMetadata, StationState};
use crate::{tfl, types::LineState};

pub fn get_routes() -> Vec<Route> {
    routes![line_history, station_history, station_details]
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
    status: LineState,
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

#[derive(Debug, Clone, Serialize)]
struct ApiStationHistory {
    history: Vec<ApiStationStatus>,
}

#[derive(Debug, Clone, Serialize)]
struct ApiStationStatus {
    entries: Vec<ApiStationStatusEntry>,
    from: SerializableDateTime,
    to: Option<SerializableDateTime>,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
struct ApiStationStatusEntry {
    status: StationState,
    description: String,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
struct StationDetails {
    name: String,
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
async fn line_history(
    mut store: StoreConnection,
    from: SerializableDateTime,
    to: SerializableDateTime,
) -> Result<Json<HashMap<String, ApiLineHistory>>, rocket::http::Status> {
    check_time_range(&from, &to)?;
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
                    let (metadata, parsed_entries) =
                        tfl::try_parse_line_status(&line, &entry.data)?;
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

#[get("/v1/station-history?<from>&<to>")]
async fn station_history(
    mut store: StoreConnection,
    from: SerializableDateTime,
    to: SerializableDateTime,
) -> Result<Json<HashMap<String, ApiStationHistory>>, rocket::http::Status> {
    check_time_range(&from, &to)?;
    let status_history = store
        .get_station_status_history(from.into(), to.into())
        .await
        .map_err(|e| {
            error!("Error getting station status history: {:?}", e);
            rocket::http::Status::InternalServerError
        })?;
    let response = status_history
        .into_iter()
        .map(|(station, entries)| {
            let history = entries
                .into_iter()
                .filter_map(|entry| {
                    let parsed_entries = tfl::try_parse_station_status(&station, &entry.data)?;
                    Some(ApiStationStatus {
                        entries: parsed_entries
                            .into_iter()
                            .map(|e| ApiStationStatusEntry {
                                status: e.status,
                                description: e.description,
                            })
                            .collect::<Vec<_>>(),
                        from: entry.start_time.into(),
                        to: entry.end_time.map(SerializableDateTime::from),
                    })
                })
                .fold(Vec::<ApiStationStatus>::new(), |mut acc, status| {
                    if let Some(last_status) = acc.last_mut() {
                        if last_status.entries == status.entries {
                            last_status.to = status.to;
                            return acc;
                        }
                    }
                    acc.push(status);
                    acc
                });
            (station, ApiStationHistory { history })
        })
        .collect::<HashMap<_, _>>();
    Ok(Json(response))
}

#[get("/v1/station-details")]
async fn station_details(
    loaded_details: &State<Arc<LoadedStationDetails>>,
) -> Result<Json<HashMap<String, StationDetails>>, rocket::http::Status> {
    // Try to get the details, which will load them if not loaded yet
    let details = loaded_details.get_details().await.map_err(|e| {
        error!("Error getting station details: {}", e);
        rocket::http::Status::ServiceUnavailable
    })?;

    // Convert to response format
    let response: HashMap<String, StationDetails> = details
        .iter()
        .map(|details| {
            (
                details.id.clone(),
                StationDetails {
                    name: details.common_name.clone(),
                },
            )
        })
        .collect();

    Ok(Json(response))
}

fn check_time_range(
    from: &SerializableDateTime,
    to: &SerializableDateTime,
) -> Result<(), rocket::http::Status> {
    if to.0 - from.0 > 32.days() {
        warn!("Rqeuest range too large: {} to {}", from.0, to.0);
        return Err(rocket::http::Status::BadRequest);
    }
    Ok(())
}
