use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DefaultUrls {
    pub base: String,
    pub production: String,
}
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Environment {
    Default(DefaultUrls),
}
impl Environment {
    pub fn url(&self) -> &str {
        match self {
            Self::Default(urls) => &urls.base,
        }
    }

    pub fn base_url(&self) -> &str {
        match self {
            Self::Default(urls) => &urls.base,
        }
    }

    pub fn production_url(&self) -> &str {
        match self {
            Self::Default(urls) => &urls.production,
        }
    }
}
impl Default for Environment {
    fn default() -> Self {
        Self::Default(DefaultUrls {
            base: "https://cftest-sdk-api.gedw99.workers.dev/api/mock".to_string(),
            production: "wss://cftest-sdk-api.gedw99.workers.dev/api/mock".to_string(),
        })
    }
}
