mod fairing;
mod sqlite;

use std::sync::Arc;

use rocket::request::FromRequest;

pub use self::sqlite::SqliteConnection as StoreConnection;
use self::sqlite::SqliteStore;

pub use self::fairing::StoreFairing;

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
