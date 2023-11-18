mod fairing;
mod sqlite;

use std::sync::Arc;

use rocket::request::FromRequest;

use self::sqlite::SqliteStore;
pub use self::sqlite::{
    ConnectionError, GetStatusError, InitializationError, SetStatusError,
    SqliteConnection as StoreConnection,
};

pub use self::fairing::StoreFairing;

#[derive(Clone)]
pub struct Store {
    inner: Arc<SqliteStore>,
}

impl Store {
    pub async fn new() -> Result<Self, InitializationError> {
        let inner = Arc::new(SqliteStore::new().await?);
        Ok(Store { inner })
    }

    pub async fn shutdown(&self) {
        self.inner.shutdown().await;
    }

    pub async fn get_connection(&self) -> Result<StoreConnection, ConnectionError> {
        self.inner.get_connection().await
    }
}

#[rocket::async_trait]
impl<'r> FromRequest<'r> for StoreConnection {
    type Error = ConnectionError;

    async fn from_request(
        request: &'r rocket::Request<'_>,
    ) -> rocket::request::Outcome<Self, Self::Error> {
        let store = request.rocket().state::<Store>().unwrap();
        match store.get_connection().await {
            Ok(conn) => rocket::request::Outcome::Success(conn),
            Err(e) => {
                rocket::request::Outcome::Error((rocket::http::Status::InternalServerError, e))
            }
        }
    }
}
