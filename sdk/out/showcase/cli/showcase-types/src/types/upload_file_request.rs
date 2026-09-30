pub use crate::prelude::*;
#[allow(unused_imports)]
use super::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct UploadFileRequest {
    #[serde(default)]
    #[serde(with = "crate::core::base64_bytes")]
    pub file: Vec<u8>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub note: Option<String>,
}
impl UploadFileRequest {
    pub fn to_multipart(self) -> reqwest::multipart::Form {
    let mut form = reqwest::multipart::Form::new();

    form = form.part(
        "file",
        reqwest::multipart::Part::bytes(self.file.clone())
            .file_name("file")
            .mime_str("application/octet-stream").unwrap()
    );

    if let Some(ref value) = self.note {
        form = form.text("note", value.clone());
    }

    form
}
}

impl UploadFileRequest {
    pub fn builder() -> UploadFileRequestBuilder {
        <UploadFileRequestBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct UploadFileRequestBuilder {
    file: Option<Vec<u8>>,
    note: Option<String>,
}

impl UploadFileRequestBuilder {
    pub fn file(mut self, value: Vec<u8>) -> Self {
        self.file = Some(value);
        self
    }

    pub fn note(mut self, value: impl Into<String>) -> Self {
        self.note = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`UploadFileRequest`].
    /// This method will fail if any of the following fields are not set:
    /// - [`file`](UploadFileRequestBuilder::file)
    pub fn build(self) -> Result<UploadFileRequest, BuildError> {
        Ok(UploadFileRequest {
            file: self.file.ok_or_else(|| BuildError::missing_field("file"))?,
            note: self.note,
        })
    }
}
