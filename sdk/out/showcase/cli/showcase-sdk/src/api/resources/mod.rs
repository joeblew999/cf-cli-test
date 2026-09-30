//! Service clients and API endpoints
//!
//! This module contains client implementations for:
//!
//! - **Auth**
//! - **Notes**
//! - **Files**

use crate::api::*;
use crate::{ApiError, ClientConfig, HttpClient, RequestOptions, SseStream};
use reqwest::Method;

pub mod auth;
pub mod files;
pub mod notes;
pub struct ApiClient {
    pub config: ClientConfig,
    pub http_client: HttpClient,
    pub auth: AuthClient,
    pub notes: NotesClient,
    pub files: FilesClient,
}

impl ApiClient {
    pub fn new(config: ClientConfig) -> Result<Self, ApiError> {
        Ok(Self {
            config: config.clone(),
            http_client: HttpClient::new(config.clone())?,
            auth: {
                let mut cfg = config.clone();
                cfg.base_url = cfg
                    .environment
                    .as_ref()
                    .map_or_else(|| cfg.base_url.clone(), |env| env.base_url().to_string());
                AuthClient::new(cfg)?
            },
            notes: {
                let mut cfg = config.clone();
                cfg.base_url = cfg
                    .environment
                    .as_ref()
                    .map_or_else(|| cfg.base_url.clone(), |env| env.base_url().to_string());
                NotesClient::new(cfg)?
            },
            files: {
                let mut cfg = config.clone();
                cfg.base_url = cfg
                    .environment
                    .as_ref()
                    .map_or_else(|| cfg.base_url.clone(), |env| env.base_url().to_string());
                FilesClient::new(cfg)?
            },
        })
    }

    /// # Examples
    ///
    /// ```no_run
    /// use showcase_sdk::prelude::*;
    ///
    /// #[tokio::main]
    /// async fn main() {
    ///     let config = ClientConfig {
    ///         ..Default::default()
    ///     };
    ///     let client = ShowcaseClient::new(config).expect("Failed to build client");
    ///     client
    ///         .chat(
    ///             &ChatRequest {
    ///                 prompt: "prompt".to_string(),
    ///             },
    ///             None,
    ///         )
    ///         .await;
    /// }
    /// ```
    pub async fn chat(
        &self,
        request: &ChatRequest,
        options: Option<RequestOptions>,
    ) -> Result<SseStream<Chunk>, ApiError> {
        self.http_client
            .execute_sse_request(
                Method::POST,
                "chat",
                Some(serde_json::to_value(request).map_err(ApiError::Serialization)?),
                None,
                options,
                None,
            )
            .await
    }
}

pub use auth::AuthClient;
pub use files::FilesClient;
pub use notes::NotesClient;
