//! Service clients and API endpoints
//!
//! This module contains client implementations for:
//!
//! - **Meta**
//! - **Notes**

use crate::{ApiError, ClientConfig};

pub mod meta;
pub mod notes;
pub struct ApiClient {
    pub config: ClientConfig,
    pub meta: MetaClient,
    pub notes: NotesClient,
}

impl ApiClient {
    pub fn new(config: ClientConfig) -> Result<Self, ApiError> {
        Ok(Self {
            config: config.clone(),
            meta: {
                let mut cfg = config.clone();
                cfg.base_url = cfg
                    .service_url(|environment| environment.base_url())
                    .to_string();
                MetaClient::new(cfg)?
            },
            notes: {
                let mut cfg = config.clone();
                cfg.base_url = cfg
                    .service_url(|environment| environment.base_url())
                    .to_string();
                NotesClient::new(cfg)?
            },
        })
    }
}

pub use meta::MetaClient;
pub use notes::NotesClient;
