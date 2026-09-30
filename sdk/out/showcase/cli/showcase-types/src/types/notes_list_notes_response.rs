pub use crate::prelude::*;
#[allow(unused_imports)]
use super::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct ListNotesResponse {
    #[serde(default)]
    pub data: Vec<Note>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub next_cursor: Option<String>,
}

impl ListNotesResponse {
    pub fn builder() -> ListNotesResponseBuilder {
        <ListNotesResponseBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct ListNotesResponseBuilder {
    data: Option<Vec<Note>>,
    next_cursor: Option<String>,
}

impl ListNotesResponseBuilder {
    pub fn data(mut self, value: Vec<Note>) -> Self {
        self.data = Some(value);
        self
    }

    pub fn next_cursor(mut self, value: impl Into<String>) -> Self {
        self.next_cursor = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`ListNotesResponse`].
    /// This method will fail if any of the following fields are not set:
    /// - [`data`](ListNotesResponseBuilder::data)
    pub fn build(self) -> Result<ListNotesResponse, BuildError> {
        Ok(ListNotesResponse {
            data: self.data.ok_or_else(|| BuildError::missing_field("data"))?,
            next_cursor: self.next_cursor,
        })
    }
}
