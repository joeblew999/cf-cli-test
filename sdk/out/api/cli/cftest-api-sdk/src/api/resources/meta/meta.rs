use crate::api::*;
use crate::{ApiError, ClientConfig, HttpClient, RequestOptions};
use reqwest::Method;

pub struct MetaClient {
    pub http_client: HttpClient,
}

impl MetaClient {
    pub fn new(config: ClientConfig) -> Result<Self, ApiError> {
        Ok(Self {
            http_client: HttpClient::new(config.clone())?,
        })
    }

    /// # Examples
    ///
    /// ```no_run
    /// use cftest_api_sdk::prelude::*;
    ///
    /// #[tokio::main]
    /// async fn main() {
    ///     let config = ClientConfig {
    ///         ..Default::default()
    ///     };
    ///     let client = CftestApiClient::new(config).expect("Failed to build client");
    ///     client.meta.hello(None).await;
    /// }
    /// ```
    pub async fn hello(
        &self,
        options: Option<RequestOptions>,
    ) -> Result<HelloMetaResponse, ApiError> {
        let base_url = self
            .http_client
            .config()
            .service_url(|environment| environment.base_url());
        self.http_client
            .execute_request_with_base_url(base_url, Method::GET, "api/hello", None, None, options)
            .await
    }
}
