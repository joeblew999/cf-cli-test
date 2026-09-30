pub use crate::prelude::*;
#[allow(unused_imports)]
use super::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct Note {
    #[serde(default)]
    pub id: String,
    #[serde(default)]
    pub body: String,
}

impl Note {
    pub fn builder() -> NoteBuilder {
        <NoteBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct NoteBuilder {
    id: Option<String>,
    body: Option<String>,
}

impl NoteBuilder {
    pub fn id(mut self, value: impl Into<String>) -> Self {
        self.id = Some(value.into());
        self
    }

    pub fn body(mut self, value: impl Into<String>) -> Self {
        self.body = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`Note`].
    /// This method will fail if any of the following fields are not set:
    /// - [`id`](NoteBuilder::id)
    /// - [`body`](NoteBuilder::body)
    pub fn build(self) -> Result<Note, BuildError> {
        Ok(Note {
            id: self.id.ok_or_else(|| BuildError::missing_field("id"))?,
            body: self.body.ok_or_else(|| BuildError::missing_field("body"))?,
        })
    }
}
