use crate::api::*;
use crate::{ApiError, ClientConfig, HttpClient, RequestOptions};
use reqwest::Method;

pub struct PetsClient {
    pub http_client: HttpClient,
}

impl PetsClient {
    pub fn new(config: ClientConfig) -> Result<Self, ApiError> {
        Ok(Self {
            http_client: HttpClient::new(config.clone())?,
        })
    }

    /// # Examples
    ///
    /// ```no_run
    /// use petstore_sdk::prelude::*;
    ///
    /// #[tokio::main]
    /// async fn main() {
    ///     let config = ClientConfig {
    ///         ..Default::default()
    ///     };
    ///     let client = PetstoreClient::new(config).expect("Failed to build client");
    ///     client.pets.list_pets(None).await;
    /// }
    /// ```
    pub async fn list_pets(&self, options: Option<RequestOptions>) -> Result<Vec<Pet>, ApiError> {
        self.http_client
            .execute_request(Method::GET, "pets", None, None, options)
            .await
    }

    /// # Examples
    ///
    /// ```no_run
    /// use petstore_sdk::prelude::*;
    ///
    /// #[tokio::main]
    /// async fn main() {
    ///     let config = ClientConfig {
    ///         ..Default::default()
    ///     };
    ///     let client = PetstoreClient::new(config).expect("Failed to build client");
    ///     client
    ///         .pets
    ///         .create_pet(
    ///             &Pet {
    ///                 name: "name".to_string(),
    ///                 ..Default::default()
    ///             },
    ///             None,
    ///         )
    ///         .await;
    /// }
    /// ```
    pub async fn create_pet(
        &self,
        request: &Pet,
        options: Option<RequestOptions>,
    ) -> Result<Pet, ApiError> {
        self.http_client
            .execute_request(
                Method::POST,
                "pets",
                Some(serde_json::to_value(request).map_err(ApiError::Serialization)?),
                None,
                options,
            )
            .await
    }
}
