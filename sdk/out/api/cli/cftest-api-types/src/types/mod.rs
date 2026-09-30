//! Request and response types for the cftest-api
//!
//! This module contains all data structures used for API communication,
//! including request bodies, response types, and shared models.
//!
//! ## Type Categories
//!
//! - **Request/Response Types**: 8 types for API operations
//! - **Model Types**: 1 types for data representation

pub mod meta_hello_meta_response;
pub mod notes_list_notes_response_data_item;
pub mod notes_list_notes_response;
pub mod notes_create_notes_response;
pub mod notes_watch_notes_response;
pub mod live_notes_note;
pub mod create_notes_request;
pub mod list_query_request;
pub mod watch_query_request;

pub use meta_hello_meta_response::HelloMetaResponse;
pub use notes_list_notes_response_data_item::ListNotesResponseDataItem;
pub use notes_list_notes_response::ListNotesResponse;
pub use notes_create_notes_response::CreateNotesResponse;
pub use notes_watch_notes_response::WatchNotesResponse;
pub use live_notes_note::Note;
pub use create_notes_request::CreateNotesRequest;
pub use list_query_request::ListQueryRequest;
pub use watch_query_request::WatchQueryRequest;

