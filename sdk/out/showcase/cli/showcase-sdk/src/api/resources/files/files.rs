use crate::api::*;
use crate::{ApiError, ClientConfig, HttpClient, RequestOptions};
use reqwest::Method;

pub struct FilesClient {
    pub http_client: HttpClient,
}

impl FilesClient {
    pub fn new(config: ClientConfig) -> Result<Self, ApiError> {
        Ok(Self {
            http_client: HttpClient::new(config.clone())?,
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
    ///         .files
    ///         .upload_file(
    ///             &UploadFileRequest {
    ///                 file: b"test file content".to_vec(),
    ///                 note: None,
    ///             },
    ///             None,
    ///         )
    ///         .await;
    /// }
    /// ```
    pub async fn upload_file(
        &self,
        request: &UploadFileRequest,
        options: Option<RequestOptions>,
    ) -> Result<UploadFileResponse, ApiError> {
        self.http_client
            .execute_multipart_request(
                Method::POST,
                "files",
                request.clone().to_multipart(),
                None,
                options,
            )
            .await
    }
}
