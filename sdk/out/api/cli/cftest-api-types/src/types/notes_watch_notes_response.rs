pub use crate::prelude::*;
#[allow(unused_imports)]
use super::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct WatchNotesResponse {
    #[serde(default)]
    pub id: i64,
    #[serde(default)]
    pub body: String,
    #[serde(default)]
    pub created_at: String,
}

impl WatchNotesResponse {
    pub fn builder() -> WatchNotesResponseBuilder {
        <WatchNotesResponseBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct WatchNotesResponseBuilder {
    id: Option<i64>,
    body: Option<String>,
    created_at: Option<String>,
}

impl WatchNotesResponseBuilder {
    pub fn id(mut self, value: i64) -> Self {
        self.id = Some(value);
        self
    }

    pub fn body(mut self, value: impl Into<String>) -> Self {
        self.body = Some(value.into());
        self
    }

    pub fn created_at(mut self, value: impl Into<String>) -> Self {
        self.created_at = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`WatchNotesResponse`].
    /// This method will fail if any of the following fields are not set:
    /// - [`id`](WatchNotesResponseBuilder::id)
    /// - [`body`](WatchNotesResponseBuilder::body)
    /// - [`created_at`](WatchNotesResponseBuilder::created_at)
    pub fn build(self) -> Result<WatchNotesResponse, BuildError> {
        Ok(WatchNotesResponse {
            id: self.id.ok_or_else(|| BuildError::missing_field("id"))?,
            body: self.body.ok_or_else(|| BuildError::missing_field("body"))?,
            created_at: self.created_at.ok_or_else(|| BuildError::missing_field("created_at"))?,
        })
    }
}
