pub use crate::prelude::*;
#[allow(unused_imports)]
use super::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct NoteCreatedWebhookPayload {
    #[serde(default)]
    pub event: String,
    #[serde(default)]
    pub note: Note,
}

impl NoteCreatedWebhookPayload {
    pub fn builder() -> NoteCreatedWebhookPayloadBuilder {
        <NoteCreatedWebhookPayloadBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct NoteCreatedWebhookPayloadBuilder {
    event: Option<String>,
    note: Option<Note>,
}

impl NoteCreatedWebhookPayloadBuilder {
    pub fn event(mut self, value: impl Into<String>) -> Self {
        self.event = Some(value.into());
        self
    }

    pub fn note(mut self, value: Note) -> Self {
        self.note = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`NoteCreatedWebhookPayload`].
    /// This method will fail if any of the following fields are not set:
    /// - [`event`](NoteCreatedWebhookPayloadBuilder::event)
    /// - [`note`](NoteCreatedWebhookPayloadBuilder::note)
    pub fn build(self) -> Result<NoteCreatedWebhookPayload, BuildError> {
        Ok(NoteCreatedWebhookPayload {
            event: self.event.ok_or_else(|| BuildError::missing_field("event"))?,
            note: self.note.ok_or_else(|| BuildError::missing_field("note"))?,
        })
    }
}
