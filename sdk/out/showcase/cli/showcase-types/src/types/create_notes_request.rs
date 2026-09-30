pub use crate::prelude::*;
#[allow(unused_imports)]
use super::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct CreateNotesRequest {
    #[serde(default)]
    pub body: String,
}

impl CreateNotesRequest {
    pub fn builder() -> CreateNotesRequestBuilder {
        <CreateNotesRequestBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct CreateNotesRequestBuilder {
    body: Option<String>,
}

impl CreateNotesRequestBuilder {
    pub fn body(mut self, value: impl Into<String>) -> Self {
        self.body = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`CreateNotesRequest`].
    /// This method will fail if any of the following fields are not set:
    /// - [`body`](CreateNotesRequestBuilder::body)
    pub fn build(self) -> Result<CreateNotesRequest, BuildError> {
        Ok(CreateNotesRequest {
            body: self.body.ok_or_else(|| BuildError::missing_field("body"))?,
        })
    }
}

