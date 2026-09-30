use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DefaultUrls {
    pub base: String,
    pub production: String,
}
impl Default for DefaultUrls {
    fn default() -> Self {
        Self {
            base: "https://cftest-api.gedw99.workers.dev".to_string(),
            production: "wss://cftest-api.gedw99.workers.dev".to_string(),
        }
    }
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
        Self::Default(DefaultUrls::default())
    }
}
