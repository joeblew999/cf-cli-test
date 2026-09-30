//! # Showcase SDK
//!
//! The official Rust SDK for the Showcase.
//!
//! ## Getting Started
//!
//! ```rust
//! use showcase_sdk::prelude::*;
//!
//! #[tokio::main]
//! async fn main() {
//!     let config = ClientConfig {
//!         ..Default::default()
//!     };
//!     let client = ShowcaseClient::new(config).expect("Failed to build client");
//!     client
//!         .auth
//!         .get_token(
//!             &GetTokenRequest {
//!                 client_id: "client_id".to_string(),
//!                 client_secret: "client_secret".to_string(),
//!             },
//!             None,
//!         )
//!         .await;
//! }
//! ```
//!
//! ## Modules
//!
//! - [`api`] - Core API types and models
//! - [`client`] - Client implementations
//! - [`config`] - Configuration options
//! - [`core`] - Core utilities and infrastructure
//! - [`error`] - Error types and handling
//! - [`prelude`] - Common imports for convenience
//! - [`webhooks`] - Webhook signature verification helpers

pub mod api;
pub mod client;
pub mod config;
pub mod core;
pub mod environment;
pub mod error;
pub mod prelude;
pub mod webhooks;

pub use client::*;
pub use config::*;
pub use core::*;
pub use environment::*;
pub use error::{ApiError, BuildError};
