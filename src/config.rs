use serde::Deserialize;

#[derive(Debug, Deserialize)]
pub struct Config {
    #[serde(default)]
    pub cors_origins: Vec<String>,

    #[serde(default)]
    pub tfl_api_key: Option<String>,
}
