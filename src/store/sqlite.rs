use std::collections::HashMap;

use serde_json::Value;
use sqlx;
use time::OffsetDateTime;

use super::{AbstractStore, LineHistoryEntry};

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
    pub async fn new() -> Self {
        let pool = sqlx::sqlite::SqlitePoolOptions::new()
            .max_connections(5)
            .connect("sqlite:./store/store.db")
            .await
            .unwrap();
        sqlx::query(
            "CREATE TABLE IF NOT EXISTS history (
            line TEXT NOT NULL,
            start_time INTEGER NOT NULL,
            end_time INTEGER,
            data BLOB NOT NULL
        )",
        )
        .execute(&pool)
        .await
        .unwrap();
        SqliteStore { pool }
    }

    pub async fn shutdown(&self) {
        self.pool.close().await;
    }
}

#[async_trait]
impl AbstractStore for SqliteStore {
    async fn get_status_history<'a>(
        &'a self,
        start_time: OffsetDateTime,
        end_time: OffsetDateTime,
    ) -> HashMap<String, Vec<LineHistoryEntry>> {
        sqlx::query_as::<_, SqliteHistoryEntry>(
            "SELECT * FROM history WHERE start_time <= ? AND (end_time IS NULL OR end_time >= ?)",
        )
        .bind(end_time.unix_timestamp())
        .bind(start_time.unix_timestamp())
        .fetch_all(&self.pool)
        .await
        .unwrap()
        .into_iter()
        .map(|row| {
            (
                row.line,
                LineHistoryEntry {
                    start_time: OffsetDateTime::from_unix_timestamp(row.start_time).unwrap(),
                    end_time: row
                        .end_time
                        .map(|t| OffsetDateTime::from_unix_timestamp(t).unwrap()),
                    data: serde_json::from_slice(&row.data).unwrap(),
                },
            )
        })
        .fold(
            HashMap::<String, Vec<LineHistoryEntry>>::new(),
            |mut acc, (line, entry)| {
                acc.entry(line).or_insert_with(Vec::new).push(entry);
                acc
            },
        )
    }

    async fn set_status(&self, status_by_line: HashMap<String, Value>) {
        let now = OffsetDateTime::now_utc();
        let existing =
            sqlx::query_as::<_, SqliteHistoryEntry>("SELECT * FROM history WHERE end_time IS NULL")
                .fetch_all(&self.pool)
                .await
                .unwrap()
                .into_iter()
                .map(|entry| (entry.line, entry.data))
                .collect::<HashMap<_, _>>();
        for (line, status) in status_by_line {
            if let Some(existing) = existing.get(&line) {
                if &serde_json::from_slice::<Value>(&existing).unwrap() == &status {
                    continue;
                }
                log::info!(
                    "Found existing row, but it didn't match - updating: {:?}",
                    line
                );
                sqlx::query("UPDATE history SET end_time = ? WHERE line = ? AND end_time IS NULL")
                    .bind(OffsetDateTime::now_utc().unix_timestamp())
                    .bind(&line)
                    .execute(&self.pool)
                    .await
                    .unwrap();
            } else {
                log::info!("No existing entry: {:?}", line);
            }
            sqlx::query(
                "INSERT INTO history (line, start_time, end_time, data) VALUES (?, ?, NULL, ?)",
            )
            .bind(&line)
            .bind(now.unix_timestamp())
            .bind(serde_json::to_vec(&status).unwrap())
            .execute(&self.pool)
            .await
            .unwrap();
        }
    }
}
