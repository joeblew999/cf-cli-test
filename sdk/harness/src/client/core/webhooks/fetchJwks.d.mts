export interface FetchJwksArgs {
    url: string;
    keyId?: string;
}
/**
 * Fetches a public key from a JWKS endpoint and returns it as a PEM string.
 *
 * Only RSA keys (reconstructed from `n`/`e`) and keys with an `x5c` certificate chain are supported.
 * EC (kty: "EC") and OKP (kty: "OKP") keys are **not** supported and will throw an error.
 *
 * @throws {Error} If the JWKS endpoint returns a non-OK response.
 * @throws {Error} If no key matching `keyId` is found (after one cache-busting retry).
 * @throws {Error} If the selected key has an unsupported type (e.g. EC or OKP).
 */
export declare function fetchJwks(args: FetchJwksArgs): Promise<string>;
