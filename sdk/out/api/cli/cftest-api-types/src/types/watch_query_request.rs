pub use crate::prelude::*;
#[allow(unused_imports)]
use super::*;

/// Query parameters for watch
#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct WatchQueryRequest {
    /// Resume after this note id (the id of the last note you received). Absent: only notes created from now on
    #[serde(skip_serializing_if = "Option::is_none")]
    pub after: Option<String>,
    /// How long to keep the stream open
    #[serde(skip_serializing_if = "Option::is_none")]
    pub seconds: Option<i64>,
}

impl WatchQueryRequest {
    pub fn builder() -> WatchQueryRequestBuilder {
        <WatchQueryRequestBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct WatchQueryRequestBuilder {
    after: Option<String>,
    seconds: Option<i64>,
}

impl WatchQueryRequestBuilder {
    pub fn after(mut self, value: impl Into<String>) -> Self {
        self.after = Some(value.into());
        self
    }

    pub fn seconds(mut self, value: i64) -> Self {
        self.seconds = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`WatchQueryRequest`].
    pub fn build(self) -> Result<WatchQueryRequest, BuildError> {
        Ok(WatchQueryRequest {
            after: self.after,
            seconds: self.seconds,
        })
    }
}

