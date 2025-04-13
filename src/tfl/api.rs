use std::collections::HashMap;

use itertools::Itertools;
use reqwest::RequestBuilder;
use rocket::{futures::TryFutureExt, tokio::try_join};
use serde_json::Value;

use super::parser::{StopPointDetails, StopPointModeResponse};

const LINE_STATUS_API_URI: &'static str =
    "https://api.tfl.gov.uk/Line/Mode/tube,dlr,overground,elizabeth-line/Status";
const STATION_STATUS_API_URI: &'static str =
    "https://api.tfl.gov.uk/StopPoint/Mode/tube,dlr,overground,elizabeth-line/Disruption";
const TUBE_STATION_DETAILS_API_URI: &'static str = "https://api.tfl.gov.uk/StopPoint/Mode/tube";
const RAIL_STATION_DETAILS_API_URI: &'static str =
    "https://api.tfl.gov.uk/StopPoint/Mode/dlr,overground,elizabeth-line";

#[derive(Clone)]
pub struct Api {
    client: reqwest::Client,
    api_key: Option<String>,
}

impl Api {
    pub fn new(api_key: Option<String>) -> Self {
        if api_key.is_none() {
            log::warn!("No TFL API key provided");
        }
        Api {
            client: reqwest::Client::new(),
            api_key,
        }
    }

    pub async fn load_line_status(&self) -> Result<HashMap<String, Value>, ApiError> {
        let resp = self
            .add_api_key(self.client.get(LINE_STATUS_API_URI))
            .send()
            .await?;
        let tfl_status = resp.json::<Vec<Value>>().await?;
        let status = tfl_status
            .into_iter()
            .filter_map(|value| Some((value.get("id")?.as_str()?.to_string(), value)))
            .collect::<HashMap<String, Value>>();
        Ok(status)
    }

    fn add_api_key(&self, request: RequestBuilder) -> RequestBuilder {
        if let Some(api_key) = &self.api_key {
            request.query(&[("app_key", api_key)])
        } else {
            request
        }
    }

    pub async fn load_station_status(&self) -> Result<HashMap<String, Vec<Value>>, ApiError> {
        let resp = self
            .add_api_key(self.client.get(STATION_STATUS_API_URI))
            .send()
            .await?;
        let tfl_status = resp.json::<Vec<Value>>().await?;
        let status = tfl_status
            .into_iter()
            .filter_map(|value| Some((value.get("stationAtcoCode")?.as_str()?.to_string(), value)))
            .into_group_map();
        Ok(status)
    }

    pub async fn load_station_details(&self) -> Result<Vec<StopPointDetails>, ApiError> {
        let tube_req = self
            .add_api_key(self.client.get(TUBE_STATION_DETAILS_API_URI))
            .send()
            .and_then(|resp| resp.json::<StopPointModeResponse>());
        let rail_req = self
            .add_api_key(self.client.get(RAIL_STATION_DETAILS_API_URI))
            .send()
            .and_then(|resp| resp.json::<StopPointModeResponse>());
        let (tube_resp, rail_resp) = try_join!(tube_req, rail_req)?;

        Ok(tube_resp
            .stop_points
            .into_iter()
            .chain(rail_resp.stop_points.into_iter())
            // Filter to only include stations where id and stationNaptan are equal
            .filter(|point| {
                // Keep the station if stationNaptan is equal to id, or if stationNaptan is None
                match &point.station_naptan {
                    Some(naptan) => naptan == &point.id,
                    None => false, // Skip stations without a stationNaptan
                }
            })
            .collect())
    }
}

#[derive(Debug)]
pub enum ApiError {
    Reqwest(reqwest::Error),
}

impl From<reqwest::Error> for ApiError {
    fn from(err: reqwest::Error) -> Self {
        ApiError::Reqwest(err)
    }
}
