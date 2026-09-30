pub use crate::prelude::*;
#[allow(unused_imports)]
use super::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct Note {
    #[serde(default)]
    pub id: i64,
    #[serde(default)]
    pub body: String,
    #[serde(default)]
    pub created_at: String,
}

impl Note {
    pub fn builder() -> NoteBuilder {
        <NoteBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct NoteBuilder {
    id: Option<i64>,
    body: Option<String>,
    created_at: Option<String>,
}

impl NoteBuilder {
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

    /// Consumes the builder and constructs a [`Note`].
    /// This method will fail if any of the following fields are not set:
    /// - [`id`](NoteBuilder::id)
    /// - [`body`](NoteBuilder::body)
    /// - [`created_at`](NoteBuilder::created_at)
    pub fn build(self) -> Result<Note, BuildError> {
        Ok(Note {
            id: self.id.ok_or_else(|| BuildError::missing_field("id"))?,
            body: self.body.ok_or_else(|| BuildError::missing_field("body"))?,
            created_at: self.created_at.ok_or_else(|| BuildError::missing_field("created_at"))?,
        })
    }
}
