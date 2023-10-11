use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq, Eq)]
pub struct LineStatus {
    pub status: Status,
    pub reason: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord)]
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
