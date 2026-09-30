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
function hmacAlgorithmToSubtleName(algorithm) {
    switch (algorithm) {
        case "sha1":
            return "SHA-1";
        case "sha256":
            return "SHA-256";
        case "sha384":
            return "SHA-384";
        case "sha512":
            return "SHA-512";
    }
}
export function computeHmacSignature(args) {
    return __awaiter(this, void 0, void 0, function* () {
        if (RUNTIME.type === "node") {
            const crypto = yield import("crypto");
            const hmac = crypto.createHmac(args.algorithm, args.secret);
            hmac.update(args.payload);
            return hmac.digest(args.encoding);
        }
        const subtle = globalThis.crypto.subtle;
        const enc = new TextEncoder();
        const keyMaterial = yield subtle.importKey("raw", enc.encode(args.secret), { name: "HMAC", hash: hmacAlgorithmToSubtleName(args.algorithm) }, false, ["sign"]);
        const signatureBuffer = yield subtle.sign("HMAC", keyMaterial, enc.encode(args.payload));
        const bytes = new Uint8Array(signatureBuffer);
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
