import type { SignatureEncoding } from "./types.js";
export type HmacAlgorithm = "sha256" | "sha1" | "sha384" | "sha512";
export interface ComputeHmacSignatureArgs {
    payload: string;
    secret: string;
    algorithm: HmacAlgorithm;
    encoding: SignatureEncoding;
}
export declare function computeHmacSignature(args: ComputeHmacSignatureArgs): Promise<string>;
