pub use crate::prelude::*;
#[allow(unused_imports)]
use super::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct HelloMetaResponse {
    #[serde(default)]
    pub message: String,
}

impl HelloMetaResponse {
    pub fn builder() -> HelloMetaResponseBuilder {
        <HelloMetaResponseBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct HelloMetaResponseBuilder {
    message: Option<String>,
}

impl HelloMetaResponseBuilder {
    pub fn message(mut self, value: impl Into<String>) -> Self {
        self.message = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`HelloMetaResponse`].
    /// This method will fail if any of the following fields are not set:
    /// - [`message`](HelloMetaResponseBuilder::message)
    pub fn build(self) -> Result<HelloMetaResponse, BuildError> {
        Ok(HelloMetaResponse {
            message: self.message.ok_or_else(|| BuildError::missing_field("message"))?,
        })
    }
}
