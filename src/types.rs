use serde::{Deserialize, Serialize};
use serde_json::Value;
use time::OffsetDateTime;

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
pub struct LineStatus {
    pub status: LineState,
    pub reason: Option<String>,
}

pub struct LineMetadata {
    pub mode: String,
}

#[derive(Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord)]
pub enum LineState {
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

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
pub struct StationStatus {
    pub status: StationState,
    pub description: String,
}

#[derive(Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord)]
pub enum StationState {
    Closure,
    PartClosure,
    InterchangeMessage,
    Information,
    Other,
}

#[derive(Debug, Clone, Serialize)]
pub struct LineStatusHistoryEntry {
    pub start_time: OffsetDateTime,
    pub end_time: Option<OffsetDateTime>,
    pub data: Value,
}

#[derive(Debug, Clone, Serialize)]
pub struct StationStatusHistoryEntry {
    pub start_time: OffsetDateTime,
    pub end_time: Option<OffsetDateTime>,
    pub data: Vec<Value>,
}
