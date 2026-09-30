//! Webhook signature verification helpers.
//!
//! Each helper exposes `verify_signature`, which never panics and never returns an
//! error: any missing or malformed input fails closed with `false`.

#[allow(unused_imports)]
use crate::core::webhook_signature::{self, WebhookDigest, WebhookEncoding, WebhookRequestBody};

/// Verifies HMAC webhook signatures.
///
/// Extract the signature from the `x-webhook-signature` header and pass it as `signature_header`.
#[derive(Debug, Clone, Copy, Default)]
pub struct WebhooksHelper;

impl WebhooksHelper {
    /// The HTTP header carrying the webhook signature.
    pub const SIGNATURE_HEADER: &'static str = "x-webhook-signature";

    /// Verify an HMAC webhook signature. Returns `false` on any mismatch or malformed input.
    pub fn verify_signature(
        request_body: &str,
        signature_header: &str,
        signature_key: &str,
    ) -> bool {
        if signature_header.is_empty() || signature_key.is_empty() {
            return false;
        }

        let body_string = request_body;

        let payload = body_string.to_string();
        let expected = webhook_signature::compute_hmac_signature(
            &payload,
            signature_key,
            WebhookDigest::Sha256,
            WebhookEncoding::Hex,
        );
        webhook_signature::timing_safe_equal(signature_header, &expected)
    }
}
