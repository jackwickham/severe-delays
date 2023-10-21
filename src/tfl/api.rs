use std::collections::HashMap;

use reqwest::RequestBuilder;
use serde_json::Value;

const STATUS_API_URI: &'static str =
    "https://api.tfl.gov.uk/Line/Mode/tube,dlr,overground,elizabeth-line/Status";

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

    pub async fn load_status(&self) -> Result<HashMap<String, Value>, ApiError> {
        let resp = self
            .add_api_key(self.client.get(STATUS_API_URI))
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
