pub use crate::prelude::*;
#[allow(unused_imports)]
use super::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct ChatRequest {
    #[serde(default)]
    pub prompt: String,
}

impl ChatRequest {
    pub fn builder() -> ChatRequestBuilder {
        <ChatRequestBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct ChatRequestBuilder {
    prompt: Option<String>,
}

impl ChatRequestBuilder {
    pub fn prompt(mut self, value: impl Into<String>) -> Self {
        self.prompt = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`ChatRequest`].
    /// This method will fail if any of the following fields are not set:
    /// - [`prompt`](ChatRequestBuilder::prompt)
    pub fn build(self) -> Result<ChatRequest, BuildError> {
        Ok(ChatRequest {
            prompt: self.prompt.ok_or_else(|| BuildError::missing_field("prompt"))?,
        })
    }
}

