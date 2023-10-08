use serde::Deserialize;
use serde_json::Value;

use crate::types::{LineStatus, Status};

#[derive(Deserialize, Debug, Clone)]
struct TflStatus {
    #[serde(rename = "lineStatuses")]
    pub line_statuses: Vec<TflLineStatus>,
}

#[derive(Deserialize, Debug, Clone)]
struct TflLineStatus {
    #[serde(rename = "statusSeverity")]
    pub status_severity: i32,
    pub reason: Option<String>,
}


pub fn try_parse(line_id: &str, value: &Value) -> Option<LineStatus> {
    let status: TflStatus = serde_json::from_value(value.clone())
        .map_err(|err| {
            log::warn!("Error parsing TFL status for line {}: {:?}", line_id, err);
        })
        .ok()?;
    status.line_statuses.into_iter()
        .map(|s| LineStatus {
            status: from_tfl_status(s.status_severity),
            reason: s.reason
        })
        .max_by_key(|s| s.status)
}

fn from_tfl_status(status_severity: i32) -> Status {
    match status_severity {
        // 0 => Special service
        1 => Status::Closed,
        2 => Status::Suspended,
        3 => Status::PartSuspended,
        4 => Status::Closed,
        5 => Status::PartClosure,
        6 => Status::SevereDelays,
        // 7 => Reduced service
        // 8 => Bus service
        9 => Status::MinorDelays,
        10 => Status::GoodService,
        11 => Status::PartClosure,
        // 12 => Exit only
        // 13 => No step free access
        // 14 => Change of frequency
        // 15 => Diverted
        // 16 => Not running
        // 17 => Issues reported
        // 18 => No Issues
        // 19 => Information
        20 => Status::Closed,
        _ => Status::UnknownInt(status_severity),
    }
}