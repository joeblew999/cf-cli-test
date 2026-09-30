import type { SignatureEncoding } from "./types.js";
export type AsymmetricAlgorithm = "RSA_SHA256" | "RSA_SHA384" | "RSA_SHA512" | "ECDSA_SHA256" | "ECDSA_SHA384" | "ECDSA_SHA512" | "ED25519";
export interface VerifyAsymmetricSignatureArgs {
    payload: string;
    signature: string;
    publicKey: string;
    algorithm: AsymmetricAlgorithm;
    encoding: SignatureEncoding;
}
export declare function verifyAsymmetricSignature(args: VerifyAsymmetricSignatureArgs): Promise<boolean>;
