pub use crate::prelude::*;
#[allow(unused_imports)]
use super::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct UploadFileResponse {
    #[serde(default)]
    pub id: String,
    #[serde(default)]
    pub size: i64,
}

impl UploadFileResponse {
    pub fn builder() -> UploadFileResponseBuilder {
        <UploadFileResponseBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct UploadFileResponseBuilder {
    id: Option<String>,
    size: Option<i64>,
}

impl UploadFileResponseBuilder {
    pub fn id(mut self, value: impl Into<String>) -> Self {
        self.id = Some(value.into());
        self
    }

    pub fn size(mut self, value: i64) -> Self {
        self.size = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`UploadFileResponse`].
    /// This method will fail if any of the following fields are not set:
    /// - [`id`](UploadFileResponseBuilder::id)
    /// - [`size`](UploadFileResponseBuilder::size)
    pub fn build(self) -> Result<UploadFileResponse, BuildError> {
        Ok(UploadFileResponse {
            id: self.id.ok_or_else(|| BuildError::missing_field("id"))?,
            size: self.size.ok_or_else(|| BuildError::missing_field("size"))?,
        })
    }
}
