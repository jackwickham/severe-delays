use serde::{Deserialize, Serialize};
use serde_json::Value;
use time::OffsetDateTime;

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
pub struct LineStatus {
    pub status: Status,
    pub reason: Option<String>,
}

pub struct LineMetadata {
    pub mode: String,
}

#[derive(Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord)]
pub enum Status {
    Suspended,
    PartSuspended,
    PlannedClosure,
    PartClosure,
    ServiceClosed,
    SevereDelays,
    ReducedService,
    MinorDelays,
    GoodService,
    Other,
}

#[derive(Debug, Clone, Serialize)]
pub struct LineHistoryEntry {
    pub start_time: OffsetDateTime,
    pub end_time: Option<OffsetDateTime>,
    pub data: Value,
}
