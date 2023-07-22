use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
pub struct LineStatus {
    pub status: Status,
    pub reason: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
pub enum Status {
    GoodService,
    MinorDelays,
    SevereDelays,
    PartClosure,
    ServiceClosed,
    Suspended,
    PlannedClosure,
    PartSuspended,
    UnknownInt(i32),
}