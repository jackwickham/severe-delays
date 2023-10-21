mod fairing;
mod sqlite;

use std::sync::Arc;

use rocket::request::FromRequest;
use serde::Serialize;
use serde_json::Value;
use time::OffsetDateTime;

pub use self::sqlite::SqliteConnection as StoreConnection;
use self::sqlite::SqliteStore;

pub use self::fairing::StoreFairing;

#[derive(Debug, Clone, Serialize)]
pub struct LineHistoryEntry {
    pub start_time: OffsetDateTime,
    pub end_time: Option<OffsetDateTime>,
    pub data: Value,
}

pub trait UpdateChecker: Send + Sync {
    fn should_update(&self, old: &Value, new: &Value) -> bool;
}

#[derive(Clone)]
pub struct Store {
    inner: Arc<SqliteStore>,
}

impl Store {
    pub async fn new() -> Self {
        let inner = Arc::new(SqliteStore::new().await);
        Store { inner }
    }

    pub async fn shutdown(&self) {
        self.inner.shutdown().await;
    }

    pub async fn get_connection(&self) -> StoreConnection {
        self.inner.get_connection().await
    }
}

#[rocket::async_trait]
impl<'r> FromRequest<'r> for StoreConnection {
    type Error = ();

    async fn from_request(
        request: &'r rocket::Request<'_>,
    ) -> rocket::request::Outcome<Self, Self::Error> {
        let store = request.rocket().state::<Store>().unwrap();
        let conn = store.get_connection().await;
        rocket::request::Outcome::Success(conn)
    }
}
