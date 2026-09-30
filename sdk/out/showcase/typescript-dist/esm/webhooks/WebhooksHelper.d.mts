/**
 * Verify an HMAC webhook signature.
 *
 * Extract the signature from the "x-webhook-signature" header and pass it as the signatureHeader parameter.
 */
export declare class WebhooksHelper {
    static verifySignature(requestBody: string, signatureHeader: string, signatureKey: string): Promise<boolean>;
}
