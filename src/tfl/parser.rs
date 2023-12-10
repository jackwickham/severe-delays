use serde::Deserialize;
use serde_json::Value;

use crate::types::{LineMetadata, LineStatus, Status};

#[derive(Deserialize, Debug, Clone)]
struct TflStatus {
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

pub fn try_parse(line_id: &str, value: &Value) -> Option<(LineMetadata, Vec<LineStatus>)> {
    let status: TflStatus = serde_json::from_value(value.clone())
        .map_err(|err| {
            log::warn!("Error parsing TFL status for line {}: {:?}", line_id, err);
        })
        .ok()?;
    let mut statuses = status
        .line_statuses
        .into_iter()
        .map(|s| LineStatus {
            status: from_tfl_status(s.status_severity),
            reason: s.reason,
        })
        .collect::<Vec<_>>();
    statuses.sort_by_key(|s| s.status);
    let metadata = LineMetadata {
        mode: status.mode_name,
    };
    Some((metadata, statuses))
}

fn from_tfl_status(status_severity: i32) -> Status {
    match status_severity {
        0 => Status::ReducedService, // Special service
        // 1 => Closed,
        2 => Status::Suspended,
        3 => Status::PartSuspended,
        4 => Status::PlannedClosure,
        5 => Status::PartClosure,
        6 => Status::SevereDelays,
        7 => Status::ReducedService,
        // 8 => Bus service
        9 => Status::MinorDelays,
        10 => Status::GoodService,
        // 11 => Part closed
        // 12 => Exit only
        // 13 => No step free access
        // 14 => Change of frequency
        // 15 => Diverted
        // 16 => Not running
        // 17 => Issues reported
        // 18 => No Issues
        // 19 => Information
        20 => Status::ServiceClosed,
        _ => Status::Other,
    }
}
