import type { SignatureEncoding } from "./types.js";
export declare const HASH_ALGORITHM_TO_SUBTLE_NAME: {
    readonly sha1: "SHA-1";
    readonly sha256: "SHA-256";
    readonly sha384: "SHA-384";
    readonly sha512: "SHA-512";
};
export type HashAlgorithm = keyof typeof HASH_ALGORITHM_TO_SUBTLE_NAME;
export interface ComputeHashArgs {
    payload: string;
    algorithm: HashAlgorithm;
    encoding: SignatureEncoding;
}
/**
 * Compute a digest of the raw request body. Unlike computeHmacSignature this is an
 * unkeyed hash, used by providers that transmit a hash of the raw body separately
 * (e.g. Twilio's bodySHA256 query parameter) rather than signing the body directly.
 */
export declare function computeHash(args: ComputeHashArgs): Promise<string>;
