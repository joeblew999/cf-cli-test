//! Request and response types for the Showcase
//!
//! This module contains all data structures used for API communication,
//! including request bodies, response types, and shared models.
//!
//! ## Type Categories
//!
//! - **Request/Response Types**: 8 types for API operations
//! - **Model Types**: 3 types for data representation

pub mod auth_get_token_response;
pub mod notes_list_notes_response;
pub mod notes_note_created_webhook_payload;
pub mod files_upload_file_response;
pub mod note;
pub mod chunk;
pub mod get_token_request;
pub mod create_notes_request;
pub mod chat_request;
pub mod upload_file_request;
pub mod list_query_request;

pub use auth_get_token_response::GetTokenResponse;
pub use notes_list_notes_response::ListNotesResponse;
pub use notes_note_created_webhook_payload::NoteCreatedWebhookPayload;
pub use files_upload_file_response::UploadFileResponse;
pub use note::Note;
pub use chunk::Chunk;
pub use get_token_request::GetTokenRequest;
pub use create_notes_request::CreateNotesRequest;
pub use chat_request::ChatRequest;
pub use upload_file_request::UploadFileRequest;
pub use list_query_request::ListQueryRequest;

