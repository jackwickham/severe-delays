
use std::collections::HashMap;

use reqwest::RequestBuilder;
use serde::Deserialize;
use serde_json::Value;
use time::OffsetDateTime;

use crate::types::{LineStatus, Status};

const STATUS_API_URI: &'static str = "https://api.tfl.gov.uk/Line/Mode/tube,dlr,overground,elizabeth-line/Status";

pub struct Api {
    client: reqwest::Client,
    api_key: Option<String>,
}

impl Api {
    pub fn new(api_key: Option<String>) -> Self {
        Api {
            client: reqwest::Client::new(),
            api_key,
        }
    }

    pub async fn load_status(&self) -> Result<HashMap<String, Value>, ApiError> {
        let resp = self.add_api_key(self.client.get(STATUS_API_URI)).send().await?;
        let tfl_status = resp.json::<Vec<Value>>().await?;
        let status = tfl_status.into_iter()
            .filter_map(|value| Some((value.get("id")?.as_str()?.to_string(), value)))
            .collect::<HashMap<String, Value>>();
        Ok(status)
    }

    /*
                .map(|status| (
                status.name,
                status.line_statuses.into_iter()
                    .max_by_key(|s| s.status_severity)
                    .map(|s| LineStatus {
                        status: Api::from_tfl_status(s.status_severity),
                        reason: s.reason,
                    })))
            .filter_map(|(line, maybe_status)| maybe_status.map(|status| (line, status)))
             */

    fn add_api_key(&self, request: RequestBuilder) -> RequestBuilder {
        if let Some(api_key) = &self.api_key {
            request.query(&[("app_key", api_key)])
        } else {
            request
        }
    }
}

fn lenient_deserialize_optional_datetime<'de, D>(deserializer: D) -> Result<Option<OffsetDateTime>, D::Error>
where
    D: serde::Deserializer<'de>,
{
    let s: Option<String> = Option::deserialize(deserializer)?;
    match s {
        Some(s) => Ok(OffsetDateTime::parse(s.as_str(), &time::format_description::well_known::Iso8601::PARSING)
            .map(Some)
            .unwrap_or_default()),
        None => Ok(None),
    }
}

#[derive(Debug)]
pub enum ApiError {
    Reqwest(reqwest::Error),
    Serde(serde_json::Error),
}

impl From<reqwest::Error> for ApiError {
    fn from(err: reqwest::Error) -> Self {
        ApiError::Reqwest(err)
    }
}

impl From<serde_json::Error> for ApiError {
    fn from(err: serde_json::Error) -> Self {
        ApiError::Serde(err)
    }
}


#[cfg(test)]
mod test {
    use time::macros::datetime;

    use super::*;

    #[test]
    fn test_lenient_deserialize_optional_datetime() {
        let s = r#""2023-05-03T16:38:46.733Z""#;
        let expected = datetime!(2023-05-03 16:38:46.733 UTC);
        let actual = lenient_deserialize_optional_datetime(&mut serde_json::Deserializer::from_str(s)).unwrap();
        assert_eq!(Some(expected), actual);
    }

    #[test]
    fn test_lenient_deserialize_optional_datetime_zero() {
        let s = r#""0001-01-01T00:00:00""#;
        let actual = lenient_deserialize_optional_datetime(&mut serde_json::Deserializer::from_str(s)).unwrap();
        assert_eq!(None, actual);
    }

    #[test]
    fn test_lenient_deserialize_optional_datetime_null() {
        let s = r#""null""#;
        let actual = lenient_deserialize_optional_datetime(&mut serde_json::Deserializer::from_str(s)).unwrap();
        assert_eq!(None, actual);
    }
}
