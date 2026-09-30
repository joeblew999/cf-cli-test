pub use crate::prelude::*;
#[allow(unused_imports)]
use super::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct Chunk {
    #[serde(default)]
    pub text: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub done: Option<bool>,
}

impl Chunk {
    pub fn builder() -> ChunkBuilder {
        <ChunkBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct ChunkBuilder {
    text: Option<String>,
    done: Option<bool>,
}

impl ChunkBuilder {
    pub fn text(mut self, value: impl Into<String>) -> Self {
        self.text = Some(value.into());
        self
    }

    pub fn done(mut self, value: bool) -> Self {
        self.done = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`Chunk`].
    /// This method will fail if any of the following fields are not set:
    /// - [`text`](ChunkBuilder::text)
    pub fn build(self) -> Result<Chunk, BuildError> {
        Ok(Chunk {
            text: self.text.ok_or_else(|| BuildError::missing_field("text"))?,
            done: self.done,
        })
    }
}
