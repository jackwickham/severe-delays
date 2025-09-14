use std::collections::HashMap;

use itertools::Itertools;
use serde::Deserialize;
use serde_json::Value;

use crate::types::{LineMetadata, LineState, LineStatus, StationState, StationStatus};

#[derive(Deserialize, Debug, Clone)]
struct TflLineStatusWrapper {
    #[serde(rename = "lineStatuses")]
    pub line_statuses: Vec<TflLineStatus>,
    #[serde(rename = "modeName")]
    pub mode_name: String,
}

#[derive(Deserialize, Debug, Clone)]
struct TflLineStatus {
    #[serde(rename = "statusSeverity")]
    pub status_severity: i32,
    pub reason: Option<String>,
}

pub fn try_parse_line_status(
    line_id: &str,
    value: &Value,
) -> Option<(LineMetadata, Vec<LineStatus>)> {
    let status: TflLineStatusWrapper = serde_json::from_value(value.clone())
        .map_err(|err| {
            log::warn!("Error parsing TFL status for line {}: {:?}", line_id, err);
        })
        .ok()?;
    let mut statuses = status
        .line_statuses
        .into_iter()
        .map(|s| LineStatus {
            status: from_tfl_line_status(s.status_severity),
            reason: s.reason,
        })
        .collect::<Vec<_>>();
    statuses.sort();
    let metadata = LineMetadata {
        mode: status.mode_name,
    };
    Some((metadata, statuses))
}

fn from_tfl_line_status(status_severity: i32) -> LineState {
    match status_severity {
        0 => LineState::ReducedService, // Special service
        // 1 => Closed,
        2 => LineState::Suspended,
        3 => LineState::PartSuspended,
        4 => LineState::PlannedClosure,
        5 => LineState::PartClosure,
        6 => LineState::SevereDelays,
        7 => LineState::ReducedService,
        // 8 => Bus service
        9 => LineState::MinorDelays,
        10 => LineState::GoodService,
        // 11 => Part closed
        // 12 => Exit only
        // 13 => No step free access
        // 14 => Change of frequency
        // 15 => Diverted
        // 16 => Not running
        // 17 => Issues reported
        // 18 => No Issues
        // 19 => Information
        20 => LineState::ServiceClosed,
        _ => LineState::Other,
    }
}

#[derive(Deserialize, Debug, Clone)]
struct TflStationStatus {
    #[serde(rename = "atcoCode")]
    pub atco_code: String,
    #[serde(rename = "type")]
    pub type_str: String,
    pub description: String,
}

pub fn try_parse_station_status(line_id: &str, values: &Vec<Value>) -> Option<Vec<StationStatus>> {
    let mut statuses: Vec<StationStatus> = values
        .iter()
        .map(|value| {
            serde_json::from_value::<TflStationStatus>(value.clone())
                .map_err(|err| {
                    log::warn!(
                        "Error parsing TFL status for station {}: {:?}",
                        line_id,
                        err
                    );
                    err
                })
                .map(|status| StationStatus {
                    status: from_tfl_station_status(&status.type_str),
                    description: status.description,
                })
        })
        .try_collect()
        .ok()?;
    statuses.sort();
    Some(statuses)
}

fn from_tfl_station_status(tfl_type: &str) -> StationState {
    match tfl_type {
        "Closure" => StationState::Closure,
        "Part Closure" => StationState::PartClosure,
        "Interchange Message" => StationState::InterchangeMessage,
        "Information" => StationState::Information,
        _ => StationState::Other,
    }
}

#[derive(Deserialize, Debug, Clone)]
pub struct StopPointModeResponse {
    #[serde(rename = "stopPoints")]
    pub stop_points: Vec<StopPointDetails>,
}

#[derive(Deserialize, Debug, Clone)]
pub struct StopPointDetails {
    pub id: String,
    #[serde(rename = "commonName")]
    pub common_name: String,
    #[serde(rename = "stationNaptan", default)]
    pub station_naptan: Option<String>,
}
