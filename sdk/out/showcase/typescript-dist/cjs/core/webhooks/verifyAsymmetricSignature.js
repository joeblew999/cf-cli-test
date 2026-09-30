"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyAsymmetricSignature = verifyAsymmetricSignature;
const index_js_1 = require("../runtime/index.js");
function getNodeAlgorithmName(algorithm) {
    switch (algorithm) {
        case "RSA_SHA256":
            return "RSA-SHA256";
        case "RSA_SHA384":
            return "RSA-SHA384";
        case "RSA_SHA512":
            return "RSA-SHA512";
        case "ECDSA_SHA256":
            return "SHA256";
        case "ECDSA_SHA384":
            return "SHA384";
        case "ECDSA_SHA512":
            return "SHA512";
    }
}
// Each ECDSA curve has a fixed coordinate size for IEEE P1363 format.
// Web Crypto requires P1363 (r ∥ s), while Node's createVerify accepts DER (ASN.1 SEQUENCE).
function ecdsaCoordSize(algorithm) {
    switch (algorithm) {
        case "ECDSA_SHA256":
            return 32; // P-256
        case "ECDSA_SHA384":
            return 48; // P-384
        case "ECDSA_SHA512":
            return 66; // P-521
    }
}
// Read a DER length field starting at der[offset]. Returns [length, bytesConsumed].
// Handles both short form (1 byte) and long form (0x81/0x82 prefix).
function readDerLength(der, offset) {
    const first = der[offset];
    if (first < 0x80) {
        return [first, 1];
    }
    const numLenBytes = first & 0x7f;
    let length = 0;
    for (let i = 0; i < numLenBytes; i++) {
        length = (length << 8) | der[offset + 1 + i];
    }
    return [length, 1 + numLenBytes];
}
// Convert a DER-encoded ECDSA signature (ASN.1 SEQUENCE { INTEGER r, INTEGER s })
// to IEEE P1363 format (r ∥ s, each zero-padded to coordSize bytes).
function derToP1363(der, coordSize) {
    // DER structure: 0x30 <len> 0x02 <rLen> <r> 0x02 <sLen> <s>
    // Skip the outer SEQUENCE tag (0x30) and its length (may be long-form for P-521).
    let offset = 1; // skip 0x30
    const [, seqLenBytes] = readDerLength(der, offset);
    offset += seqLenBytes;
    if (der[offset] !== 0x02) {
        throw new Error("Invalid DER signature: expected INTEGER tag for r");
    }
    offset++; // skip 0x02 tag
    const [rLen, rLenBytes] = readDerLength(der, offset);
    offset += rLenBytes;
    const r = der.slice(offset, offset + rLen);
    offset += rLen;
    if (der[offset] !== 0x02) {
        throw new Error("Invalid DER signature: expected INTEGER tag for s");
    }
    offset++; // skip 0x02 tag
    const [sLen, sLenBytes] = readDerLength(der, offset);
    offset += sLenBytes;
    const s = der.slice(offset, offset + sLen);
    const result = new Uint8Array(new ArrayBuffer(coordSize * 2));
    // r and s may have a leading 0x00 padding byte (DER positive integer) — strip it,
    // then right-align into the fixed-size output.
    const rStripped = r[0] === 0x00 ? r.slice(1) : r;
    const sStripped = s[0] === 0x00 ? s.slice(1) : s;
    result.set(rStripped, coordSize - rStripped.length);
    result.set(sStripped, coordSize * 2 - sStripped.length);
    return result;
}
function pemToBytes(pem) {
    const lines = pem.replace(/-----[A-Z ]+-----/g, "").replace(/\s+/g, "");
    const binary = atob(lines);
    const bytes = new Uint8Array(new ArrayBuffer(binary.length));
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}
function signatureToBytes(signature, encoding) {
    if (encoding === "base64") {
        const binary = atob(signature);
        const bytes = new Uint8Array(new ArrayBuffer(binary.length));
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes;
    }
    // hex
    const bytes = new Uint8Array(new ArrayBuffer(signature.length / 2));
    for (let i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(signature.slice(i * 2, i * 2 + 2), 16);
    }
    return bytes;
}
function getSubtleAlgorithms(algorithm) {
    switch (algorithm) {
        case "RSA_SHA256":
            return {
                importAlgorithm: { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
                verifyAlgorithm: { name: "RSASSA-PKCS1-v1_5" },
            };
        case "RSA_SHA384":
            return {
                importAlgorithm: { name: "RSASSA-PKCS1-v1_5", hash: "SHA-384" },
                verifyAlgorithm: { name: "RSASSA-PKCS1-v1_5" },
            };
        case "RSA_SHA512":
            return {
                importAlgorithm: { name: "RSASSA-PKCS1-v1_5", hash: "SHA-512" },
                verifyAlgorithm: { name: "RSASSA-PKCS1-v1_5" },
            };
        case "ECDSA_SHA256":
            return {
                importAlgorithm: { name: "ECDSA", namedCurve: "P-256" },
                verifyAlgorithm: { name: "ECDSA", hash: "SHA-256" },
            };
        case "ECDSA_SHA384":
            return {
                importAlgorithm: { name: "ECDSA", namedCurve: "P-384" },
                verifyAlgorithm: { name: "ECDSA", hash: "SHA-384" },
            };
        case "ECDSA_SHA512":
            return {
                importAlgorithm: { name: "ECDSA", namedCurve: "P-521" },
                verifyAlgorithm: { name: "ECDSA", hash: "SHA-512" },
            };
        case "ED25519":
            return {
                importAlgorithm: { name: "Ed25519" },
                verifyAlgorithm: { name: "Ed25519" },
            };
    }
}
function verifyAsymmetricSignature(args) {
    return __awaiter(this, void 0, void 0, function* () {
        if (index_js_1.RUNTIME.type === "node") {
            const crypto = yield Promise.resolve().then(() => __importStar(require("crypto")));
            if (args.algorithm === "ED25519") {
                const signatureBytes = Uint8Array.from(Buffer.from(args.signature, args.encoding));
                return crypto.verify(null, Uint8Array.from(Buffer.from(args.payload)), args.publicKey, signatureBytes);
            }
            const verifier = crypto.createVerify(getNodeAlgorithmName(args.algorithm));
            verifier.update(args.payload);
            return verifier.verify(args.publicKey, args.signature, args.encoding);
        }
        const subtle = globalThis.crypto.subtle;
        const { importAlgorithm, verifyAlgorithm } = getSubtleAlgorithms(args.algorithm);
        const keyBytes = pemToBytes(args.publicKey);
        const key = yield subtle.importKey("spki", keyBytes, importAlgorithm, false, ["verify"]);
        let signatureBytes = signatureToBytes(args.signature, args.encoding);
        // Web Crypto requires IEEE P1363 format for ECDSA (raw r ∥ s), but the
        // incoming signature is DER-encoded (the format Node and most libraries produce).
        if (args.algorithm === "ECDSA_SHA256" || args.algorithm === "ECDSA_SHA384" || args.algorithm === "ECDSA_SHA512") {
            signatureBytes = derToP1363(signatureBytes, ecdsaCoordSize(args.algorithm));
        }
        const payloadBytes = new TextEncoder().encode(args.payload);
        return subtle.verify(verifyAlgorithm, key, signatureBytes, payloadBytes);
    });
}
