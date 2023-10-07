use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
pub struct LineStatus {
    pub status: Status,
    pub reason: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq, PartialOrd, Ord)]
pub enum Status {
    UnknownInt(i32),
    GoodService,
    MinorDelays,
    SevereDelays,
    PartClosure,
    Closed,
    PartSuspended,
    Suspended,
}