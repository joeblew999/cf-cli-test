var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { RUNTIME } from "../runtime/index.mjs";
export const HASH_ALGORITHM_TO_SUBTLE_NAME = {
    sha1: "SHA-1",
    sha256: "SHA-256",
    sha384: "SHA-384",
    sha512: "SHA-512",
};
/**
 * Compute a digest of the raw request body. Unlike computeHmacSignature this is an
 * unkeyed hash, used by providers that transmit a hash of the raw body separately
 * (e.g. Twilio's bodySHA256 query parameter) rather than signing the body directly.
 */
export function computeHash(args) {
    return __awaiter(this, void 0, void 0, function* () {
        if (RUNTIME.type === "node") {
            const crypto = yield import("crypto");
            const hash = crypto.createHash(args.algorithm);
            hash.update(args.payload);
            return hash.digest(args.encoding);
        }
        const subtle = globalThis.crypto.subtle;
        const enc = new TextEncoder();
        const digest = yield subtle.digest(HASH_ALGORITHM_TO_SUBTLE_NAME[args.algorithm], enc.encode(args.payload));
        const bytes = new Uint8Array(digest);
        if (args.encoding === "hex") {
            return Array.from(bytes)
                .map((b) => b.toString(16).padStart(2, "0"))
                .join("");
        }
        // base64
        let binary = "";
        for (const byte of bytes) {
            binary += String.fromCharCode(byte);
        }
        return btoa(binary);
    });
}
