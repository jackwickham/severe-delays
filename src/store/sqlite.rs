use std::collections::HashMap;

use itertools::Itertools;
use serde_json::Value;
use sqlx::{self, pool::PoolConnection, Acquire, Sqlite};
use time::OffsetDateTime;

use crate::types::LineHistoryEntry;

#[derive(Debug, sqlx::FromRow)]
struct SqliteHistoryEntry {
    line: String,
    start_time: i64,
    end_time: Option<i64>,
    data: Vec<u8>,
}

pub struct SqliteStore {
    pool: sqlx::SqlitePool,
}

impl SqliteStore {
    pub async fn new() -> Result<Self, InitializationError> {
        let pool = sqlx::sqlite::SqlitePoolOptions::new()
            .max_connections(5)
            .connect("sqlite:./store/store.db")
            .await?;
        sqlx::query(
            "CREATE TABLE IF NOT EXISTS history (
            line TEXT NOT NULL,
            start_time INTEGER NOT NULL,
            end_time INTEGER,
            data BLOB NOT NULL
        )",
        )
        .execute(&pool)
        .await?;
        Ok(SqliteStore { pool })
    }

    pub async fn shutdown(&self) {
        self.pool.close().await;
    }

    pub async fn get_connection(&self) -> Result<SqliteConnection, ConnectionError> {
        Ok(SqliteConnection {
            connection: self.pool.acquire().await?,
        })
    }
}

pub struct SqliteConnection {
    connection: PoolConnection<Sqlite>,
}

impl SqliteConnection {
    pub async fn get_status_history(
        &mut self,
        start_time: OffsetDateTime,
        end_time: OffsetDateTime,
    ) -> Result<HashMap<String, Vec<LineHistoryEntry>>, GetStatusError> {
        sqlx::query_as::<_, SqliteHistoryEntry>(
            "SELECT * FROM history WHERE start_time <= ? AND (end_time IS NULL OR end_time >= ?)",
        )
        .bind(end_time.unix_timestamp())
        .bind(start_time.unix_timestamp())
        .fetch_all(&mut *self.connection)
        .await?
        .into_iter()
        .map(|row| {
            Ok((
                LineHistoryEntry {
                    start_time: OffsetDateTime::from_unix_timestamp(row.start_time).map_err(
                        |_| {
                            GetStatusError::InvalidData(format!(
                                "{}: Invalid start time: {}",
                                row.line, row.start_time
                            ))
                        },
                    )?,
                    end_time: row
                        .end_time
                        .map(|t| {
                            OffsetDateTime::from_unix_timestamp(t).map_err(|_| {
                                GetStatusError::InvalidData(format!(
                                    "{}: Invalid end time: {}",
                                    row.line, t
                                ))
                            })
                        })
                        .transpose()?,
                    data: serde_json::from_slice(&row.data).unwrap(),
                },
                row.line,
            ))
        })
        .fold_ok(
            HashMap::<String, Vec<LineHistoryEntry>>::new(),
            |mut acc, (entry, line)| {
                acc.entry(line).or_insert_with(Vec::new).push(entry);
                acc
            },
        )
    }

    pub async fn set_status<U>(
        &mut self,
        status_by_line: HashMap<String, Value>,
        should_update: U,
    ) -> Result<(), SetStatusError>
    where
        U: Fn(&Value, &Value) -> bool + Send + Sync,
    {
        let mut txn = self.connection.begin().await?;
        let now = OffsetDateTime::now_utc();
        let existing =
            sqlx::query_as::<_, SqliteHistoryEntry>("SELECT * FROM history WHERE end_time IS NULL")
                .fetch_all(&mut *txn)
                .await?
                .into_iter()
                .map(|entry| (entry.line, entry.data))
                .collect::<HashMap<_, _>>();
        for (line, status) in status_by_line {
            if let Some(existing) = existing.get(&line) {
                if !should_update(&serde_json::from_slice::<Value>(&existing)?, &status) {
                    continue;
                }
                log::info!(
                    "Found existing row, but it didn't match - updating: {:?}",
                    line
                );
                sqlx::query("UPDATE history SET end_time = ? WHERE line = ? AND end_time IS NULL")
                    .bind(OffsetDateTime::now_utc().unix_timestamp())
                    .bind(&line)
                    .execute(&mut *txn)
                    .await?;
            } else {
                log::info!("No existing entry: {:?}", line);
            }
            sqlx::query(
                "INSERT INTO history (line, start_time, end_time, data) VALUES (?, ?, NULL, ?)",
            )
            .bind(&line)
            .bind(now.unix_timestamp())
            .bind(serde_json::to_vec(&status)?)
            .execute(&mut *txn)
            .await?;
        }
        txn.commit().await?;
        Ok(())
    }
}

#[derive(Debug)]
pub enum InitializationError {
    Sqlx(sqlx::Error),
}

impl From<sqlx::Error> for InitializationError {
    fn from(err: sqlx::Error) -> Self {
        InitializationError::Sqlx(err)
    }
}

#[derive(Debug)]
pub enum ConnectionError {
    Sqlx(sqlx::Error),
}

impl From<sqlx::Error> for ConnectionError {
    fn from(err: sqlx::Error) -> Self {
        ConnectionError::Sqlx(err)
    }
}

#[derive(Debug)]
pub enum GetStatusError {
    Sqlx(sqlx::Error),
    InvalidData(String),
}

impl From<sqlx::Error> for GetStatusError {
    fn from(err: sqlx::Error) -> Self {
        GetStatusError::Sqlx(err)
    }
}

#[derive(Debug)]
pub enum SetStatusError {
    Sqlx(sqlx::Error),
    Json(serde_json::Error),
}

impl From<sqlx::Error> for SetStatusError {
    fn from(err: sqlx::Error) -> Self {
        SetStatusError::Sqlx(err)
    }
}

impl From<serde_json::Error> for SetStatusError {
    fn from(err: serde_json::Error) -> Self {
        SetStatusError::Json(err)
    }
}
