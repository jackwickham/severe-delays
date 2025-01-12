use std::{collections::HashMap, os::linux::raw::stat};

use itertools::Itertools;
use serde_json::Value;
use sqlx::{self, pool::PoolConnection, Acquire, Sqlite};
use time::OffsetDateTime;

use crate::types::StatusHistoryEntry;

#[derive(Debug, sqlx::FromRow)]
struct SqliteLineHistoryEntry {
    line: String,
    start_time: i64,
    end_time: Option<i64>,
    data: Vec<u8>,
}

#[derive(Debug, sqlx::FromRow)]
struct SqliteStationHistoryEntry {
    station_id: String,
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

        sqlx::query("ALTER TABLE history RENAME TO line_history")
            .execute(&pool)
            .await
            .map(|_| ())
            .or_else(|err| {
                if let Some(db_err) = err.as_database_error() {
                    if db_err.message().contains("no such table") {
                        return Ok(());
                    }
                }
                return Err(err);
            })?;

        sqlx::query(
            "CREATE TABLE IF NOT EXISTS line_history (
            line TEXT NOT NULL,
            start_time INTEGER NOT NULL,
            end_time INTEGER,
            data BLOB NOT NULL
        )",
        )
        .execute(&pool)
        .await?;

        sqlx::query(
            "CREATE TABLE IF NOT EXISTS station_history (
            station_id TEXT NOT NULL,
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
    pub async fn get_line_status_history(
        &mut self,
        start_time: OffsetDateTime,
        end_time: OffsetDateTime,
    ) -> Result<HashMap<String, Vec<StatusHistoryEntry>>, GetStatusError> {
        sqlx::query_as::<_, SqliteLineHistoryEntry>(
            "SELECT * FROM line_history WHERE start_time <= ? AND (end_time IS NULL OR end_time >= ?)",
        )
        .bind(end_time.unix_timestamp())
        .bind(start_time.unix_timestamp())
        .fetch_all(&mut *self.connection)
        .await?
        .into_iter()
        .map(|row| {
            Ok((
                StatusHistoryEntry {
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
            HashMap::<String, Vec<StatusHistoryEntry>>::new(),
            |mut acc, (entry, line)| {
                acc.entry(line).or_insert_with(Vec::new).push(entry);
                acc
            },
        )
    }

    pub async fn set_line_status<U>(
        &mut self,
        status_by_line: HashMap<String, Value>,
        should_update: U,
    ) -> Result<(), SetStatusError>
    where
        U: Fn(&Value, &Value) -> bool + Send + Sync,
    {
        let mut txn = self.connection.begin().await?;
        let now = OffsetDateTime::now_utc();
        let existing = sqlx::query_as::<_, SqliteLineHistoryEntry>(
            "SELECT * FROM line_history WHERE end_time IS NULL",
        )
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
                sqlx::query(
                    "UPDATE line_history SET end_time = ? WHERE line = ? AND end_time IS NULL",
                )
                .bind(OffsetDateTime::now_utc().unix_timestamp())
                .bind(&line)
                .execute(&mut *txn)
                .await?;
            } else {
                log::info!("No existing entry: {:?}", line);
            }
            sqlx::query(
                "INSERT INTO line_history (line, start_time, end_time, data) VALUES (?, ?, NULL, ?)",
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

    pub async fn get_station_status_history(
        &mut self,
        start_time: OffsetDateTime,
        end_time: OffsetDateTime,
    ) -> Result<HashMap<String, Vec<StatusHistoryEntry>>, GetStatusError> {
        sqlx::query_as::<_, SqliteStationHistoryEntry>(
            "SELECT * FROM station_history WHERE start_time <= ? AND (end_time IS NULL OR end_time >= ?)",
        )
        .bind(end_time.unix_timestamp())
        .bind(start_time.unix_timestamp())
        .fetch_all(&mut *self.connection)
        .await?
        .into_iter()
        .map(|row| {
            Ok((
                StatusHistoryEntry {
                    start_time: OffsetDateTime::from_unix_timestamp(row.start_time).map_err(
                        |_| {
                            GetStatusError::InvalidData(format!(
                                "{}: Invalid start time: {}",
                                row.station_id, row.start_time
                            ))
                        },
                    )?,
                    end_time: row
                        .end_time
                        .map(|t| {
                            OffsetDateTime::from_unix_timestamp(t).map_err(|_| {
                                GetStatusError::InvalidData(format!(
                                    "{}: Invalid end time: {}",
                                    row.station_id, t
                                ))
                            })
                        })
                        .transpose()?,
                    data: serde_json::from_slice(&row.data).unwrap(),
                },
                row.station_id,
            ))
        })
        .fold_ok(
            HashMap::<String, Vec<StatusHistoryEntry>>::new(),
            |mut acc, (entry, line)| {
                acc.entry(line).or_insert_with(Vec::new).push(entry);
                acc
            },
        )
    }

    pub async fn set_station_status<U>(
        &mut self,
        status_by_station: HashMap<String, Value>,
        should_update: U,
    ) -> Result<(), SetStatusError>
    where
        U: Fn(&Value, &Value) -> bool + Send + Sync,
    {
        let mut txn = self.connection.begin().await?;
        let now = OffsetDateTime::now_utc();
        let existing = sqlx::query_as::<_, SqliteStationHistoryEntry>(
            "SELECT * FROM station_history WHERE end_time IS NULL",
        )
        .fetch_all(&mut *txn)
        .await?
        .into_iter()
        .map(|entry| (entry.station_id, entry.data))
        .collect::<HashMap<_, _>>();
        for station in existing.keys() {
            if !status_by_station.contains_key(station) {
                log::info!(
                    "Existing station row but no current status - setting end time: {:?}",
                    station
                );
                sqlx::query(
                    "UPDATE station_history SET end_time = ? WHERE line = ? AND end_time IS NULL",
                )
                .bind(OffsetDateTime::now_utc().unix_timestamp())
                .bind(&station)
                .execute(&mut *txn)
                .await?;
            }
        }
        for (station, status) in status_by_station {
            if let Some(existing) = existing.get(&station) {
                if !should_update(&serde_json::from_slice::<Value>(&existing)?, &status) {
                    continue;
                }
                log::info!(
                    "Found existing station row, but it didn't match - updating: {:?}",
                    station
                );
                sqlx::query(
                    "UPDATE station_history SET end_time = ? WHERE line = ? AND end_time IS NULL",
                )
                .bind(OffsetDateTime::now_utc().unix_timestamp())
                .bind(&station)
                .execute(&mut *txn)
                .await?;
            } else {
                log::info!("No existing station entry: {:?}", station);
            }
            sqlx::query(
                "INSERT INTO station_history (station_id, start_time, end_time, data) VALUES (?, ?, NULL, ?)",
            )
            .bind(&station)
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
